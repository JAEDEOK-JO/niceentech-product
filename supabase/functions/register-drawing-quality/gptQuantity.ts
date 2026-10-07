import { drawingQuantityPrompt, drawingQuantitySchema } from './drawingQuantityPrompt.ts'
import { quantitiesFromDiameterCounts, type DrawingQuantities } from './quantityFields.ts'

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

export async function readDrawingQuantities(fileName: string, bytes: Uint8Array): Promise<DrawingQuantities> {
  const apiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
  if (!apiKey.trim()) throw new Error('openai_key_missing')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-6.1-sol',
      reasoning: { effort: 'high' },
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_file',
              filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
              file_data: `data:application/pdf;base64,${bytesToBase64(bytes)}`,
            },
            { type: 'input_text', text: drawingQuantityPrompt },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'drawing_pipe_counts',
          strict: true,
          schema: drawingQuantitySchema,
        },
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`openai_failed:${response.status}:${detail.slice(0, 300)}`)
  }

  const payload = (await response.json()) as Record<string, unknown>
  const text = readOutputText(payload)
  if (!text) throw new Error('openai_empty')

  const parsed = JSON.parse(text) as { counts?: Record<string, unknown> }
  return quantitiesFromDiameterCounts(parsed.counts)
}
