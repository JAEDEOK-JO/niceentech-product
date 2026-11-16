import { readOutputText, readReasoning, readResponseStream } from './readResponseStream.ts'

const RESPONSES_URL = 'https://api.openai.com/v1/responses'
const MODEL = 'gpt-6.1-terra'
const PLAN_EFFORT = 'medium'
const PHRASE_EFFORT = 'low'

type CallOptions = {
  effort: string
  summary?: boolean
  signal?: AbortSignal
  onReasoning?: (delta: string) => void
}

function apiKey() {
  const key = (Deno.env.get('OPENAI_CHATBOT_API_KEY') ?? '').trim()
  if (!key) throw new Error('openai_key_missing')
  return key
}

function requestBody(body: Record<string, unknown>, stream: boolean, options: CallOptions) {
  const summary = options.summary !== false
  return {
    model: MODEL,
    store: false,
    max_output_tokens: 64_000,
    ...body,
    stream,
    ...(summary ? { include: ['reasoning.summary_text'] } : {}),
    reasoning: summary ? { effort: options.effort, summary: 'detailed' } : { effort: options.effort },
  }
}

function requestSignal(signal, ms) {
  const timeout = AbortSignal.timeout(ms)
  if (!signal) return timeout
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([signal, timeout])
  const controller = new AbortController()
  const abort = () => controller.abort()
  timeout.addEventListener('abort', abort)
  signal.addEventListener('abort', abort)
  if (signal.aborted || timeout.aborted) controller.abort()
  return controller.signal
}

async function postResponse(payload: Record<string, unknown>, signal?: AbortSignal) {
  try {
    return await fetch(RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: requestSignal(signal, 120_000),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('openai_timeout')
  }
}

async function complete(body: Record<string, unknown>, options: CallOptions) {
  const { signal, onReasoning } = options
  let response = await postResponse(requestBody(body, true, options), signal)
  if (response.status === 400) {
    const detail = await response.text().catch(() => '')
    if (!detail.includes('summary_text') && !detail.includes('include')) {
      throw new Error(`openai_400:${detail.slice(0, 180)}`)
    }
    response = await postResponse({ ...requestBody(body, false, options), include: undefined }, signal)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`openai_${response.status}:${detail.slice(0, 180)}`)
  }

  const streamed = response.headers.get('content-type')?.includes('text/event-stream')
  if (!streamed) {
    const payload = (await response.json()) as Record<string, unknown>
    const text = readOutputText(payload)
    const reasoning = readReasoning(payload)
    if (!text) throw new Error('openai_empty')
    if (reasoning) onReasoning?.(reasoning)
    return { text, reasoning }
  }

  if (!response.body) throw new Error('openai_empty')
  const result = await readResponseStream(response.body, onReasoning)
  if (!result.text) throw new Error('openai_empty')
  return result
}

export async function completeSchema(
  prompt: string,
  name: string,
  schema: Record<string, unknown>,
  options: CallOptions,
) {
  const result = await complete({
    input: [{ role: 'user', content: prompt }],
    text: { format: { type: 'json_schema', name, strict: true, schema } },
  }, options)
  return { value: JSON.parse(result.text) as Record<string, unknown>, reasoning: result.reasoning }
}

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sql: { type: 'string' },
    reply: { type: 'string' },
    look: { type: 'string' },
    learn: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          topic: { type: 'string' },
          note: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['topic', 'note', 'keywords'],
      },
    },
  },
  required: ['sql', 'reply', 'look', 'learn'],
}

export async function completeJson(prompt: string, onReasoning?: (delta: string) => void, signal?: AbortSignal) {
  const { value, reasoning } = await completeSchema(prompt, 'chatbot_plan', PLAN_SCHEMA, {
    effort: PLAN_EFFORT,
    signal,
    onReasoning,
  })
  return {
    sql: String(value.sql ?? '').trim(),
    reply: String(value.reply ?? '').trim(),
    look: String(value.look ?? '').trim(),
    learn: value.learn,
    reasoning,
  }
}

export async function completeText(prompt: string, onReasoning?: (delta: string) => void, signal?: AbortSignal) {
  return complete({ input: [{ role: 'user', content: prompt }] }, { effort: PHRASE_EFFORT, signal, onReasoning })
}

export async function translateToKorean(text: string, signal?: AbortSignal) {
  const prompt = `다음 글을 자연스러운 한국어로 옮긴다. 굵은 제목도 한국어로 옮기고 ** 표시는 유지한다. SQL 과 자료 이름은 그대로 둔다. 옮긴 글만 출력한다.

${text}`
  const result = await complete({ input: [{ role: 'user', content: prompt }] }, {
    effort: 'low',
    summary: false,
    signal,
  })
  return result.text
}
