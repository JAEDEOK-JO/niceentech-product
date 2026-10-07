export const QUANTITY_MODEL = 'gpt-6.1-sol'
export const QUANTITY_REASONING_EFFORT = 'high'

const RESPONSES_URL = 'https://api.openai.com/v1/responses'
const MAX_OUTPUT_TOKENS = 64_000

type JsonSchema = Record<string, unknown>

export type PdfPart = { fileName: string; bytes: Uint8Array }

export type ResponseSnapshot =
  | { state: 'running' }
  | { state: 'completed'; text: string; usage: unknown }
  | { state: 'failed'; reason: string; usage: unknown }

function apiKey() {
  const key = (Deno.env.get('OPENAI_API_KEY') ?? '').trim()
  if (!key) throw new Error('openai_key_missing')
  return key
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

function readOutputText(payload: Record<string, unknown>) {
  const direct = String(payload.output_text ?? '').trim()
  if (direct) return direct

  const output = Array.isArray(payload.output) ? payload.output : []
  const texts: string[] = []
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : []
    for (const part of content) {
      if (part?.type === 'output_text' && part.text) texts.push(String(part.text))
    }
  }
  return texts.join('\n').trim()
}

export async function submitBackgroundResponse(options: {
  pdf: PdfPart
  prompt: string
  schemaName: string
  schema: JsonSchema
}) {
  const response = await fetch(RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: QUANTITY_MODEL,
      reasoning: { effort: QUANTITY_REASONING_EFFORT },
      background: true,
      store: true,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_file',
              filename: options.pdf.fileName,
              file_data: `data:application/pdf;base64,${bytesToBase64(options.pdf.bytes)}`,
              detail: 'high',
            },
            { type: 'input_text', text: options.prompt },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: options.schemaName,
          strict: true,
          schema: options.schema,
        },
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`openai_submit_${response.status}:${detail.slice(0, 200)}`)
  }

  const payload = (await response.json()) as Record<string, unknown>
  const id = String(payload.id ?? '')
  if (!id) throw new Error('openai_submit_no_id')
  return id
}

export async function readBackgroundResponse(responseId: string): Promise<ResponseSnapshot> {
  const response = await fetch(`${RESPONSES_URL}/${encodeURIComponent(responseId)}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  })

  if (!response.ok) {
    if (response.status >= 500 || response.status === 429) return { state: 'running' }
    return { state: 'failed', reason: `openai_poll_${response.status}`, usage: null }
  }

  const payload = (await response.json()) as Record<string, unknown>
  const status = String(payload.status ?? '')
  if (status === 'queued' || status === 'in_progress') return { state: 'running' }

  if (status === 'completed') {
    const text = readOutputText(payload)
    if (!text) return { state: 'failed', reason: 'openai_empty', usage: payload.usage }
    return { state: 'completed', text, usage: payload.usage }
  }

  const error = payload.error as { code?: string } | null
  const incomplete = payload.incomplete_details as { reason?: string } | null
  const reason = incomplete?.reason ?? error?.code ?? status
  return { state: 'failed', reason: `openai_${status}:${reason}`, usage: payload.usage }
}
