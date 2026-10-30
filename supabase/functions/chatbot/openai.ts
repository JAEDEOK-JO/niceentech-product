import { readOutputText, readReasoning, readResponseStream } from './readResponseStream.ts'

const RESPONSES_URL = 'https://api.openai.com/v1/responses'
const MODEL = 'gpt-6.1-terra'
const REASONING_EFFORT = 'max'

function apiKey() {
  const key = (Deno.env.get('OPENAI_CHATBOT_API_KEY') ?? '').trim()
  if (!key) throw new Error('openai_key_missing')
  return key
}

function requestBody(body: Record<string, unknown>, stream: boolean) {
  return {
    model: MODEL,
    store: false,
    max_output_tokens: 64_000,
    ...body,
    stream,
    include: ['reasoning.summary_text'],
    reasoning: { effort: REASONING_EFFORT, summary: 'detailed' },
  }
}

async function postResponse(payload: Record<string, unknown>) {
  return fetch(RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  })
}

async function complete(body: Record<string, unknown>, onReasoning?: (delta: string) => void) {
  let response = await postResponse(requestBody(body, true))
  if (response.status === 400) {
    const detail = await response.text().catch(() => '')
    if (!detail.includes('summary_text') && !detail.includes('include')) {
      throw new Error(`openai_400:${detail.slice(0, 180)}`)
    }
    response = await postResponse({ ...requestBody(body, false), include: undefined })
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

export async function completeJson(prompt: string, onReasoning?: (delta: string) => void) {
  const result = await complete({
    input: [{ role: 'user', content: prompt }],
    text: {
      format: {
        type: 'json_schema',
        name: 'chatbot_plan',
        strict: true,
        schema: {
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
        },
      },
    },
  }, onReasoning)

  const parsed = JSON.parse(result.text) as { sql?: string; reply?: string; look?: string; learn?: unknown }
  return {
    sql: String(parsed.sql ?? '').trim(),
    reply: String(parsed.reply ?? '').trim(),
    look: String(parsed.look ?? '').trim(),
    learn: parsed.learn,
    reasoning: result.reasoning,
  }
}

export async function completeText(prompt: string, onReasoning?: (delta: string) => void) {
  return complete({
    input: [{ role: 'user', content: prompt }],
  }, onReasoning)
}
