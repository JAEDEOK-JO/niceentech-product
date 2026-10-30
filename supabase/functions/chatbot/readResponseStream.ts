export function readOutputText(payload: Record<string, unknown>) {
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

export function readReasoning(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : []
  const texts: string[] = []
  for (const item of output) {
    if (item?.type !== 'reasoning') continue
    const summary = Array.isArray(item.summary) ? item.summary : []
    for (const part of summary) {
      if (part?.text) texts.push(String(part.text))
    }
  }
  return texts.join('\n\n').trim()
}

function emitReasoning(
  state: { reasoning: string; live: string },
  delta: string,
  onReasoning?: (delta: string) => void,
) {
  if (!delta) return
  state.live += delta
  state.reasoning = state.live
  onReasoning?.(delta)
}

function applyEvent(
  event: Record<string, unknown>,
  state: { text: string; reasoning: string; live: string },
  onReasoning?: (delta: string) => void,
) {
  const type = String(event.type ?? '')
  if (type === 'response.reasoning_summary_text.delta') {
    emitReasoning(state, String(event.delta ?? ''), onReasoning)
    return
  }
  if (type === 'response.reasoning_summary_text.done') {
    const text = String(event.text ?? '')
    if (text && !state.live.includes(text)) emitReasoning(state, `${state.live ? '\n\n' : ''}${text}`, onReasoning)
    return
  }
  if (type === 'response.output_item.done') {
    const item = event.item as Record<string, unknown> | undefined
    if (item?.type !== 'reasoning') return
    const text = readReasoning({ output: [item] })
    if (!text) return
    if (!state.live) emitReasoning(state, text, onReasoning)
    else if (text.startsWith(state.live)) emitReasoning(state, text.slice(state.live.length), onReasoning)
    state.reasoning = text
    return
  }
  if (type === 'response.output_text.delta') {
    state.text += String(event.delta ?? '')
    return
  }
  if (type === 'response.output_text.done' && event.text) {
    state.text = String(event.text)
    return
  }
  if (type === 'response.completed' || type === 'response.incomplete') {
    const response = (event.response ?? {}) as Record<string, unknown>
    const fullText = readOutputText(response)
    const fullReasoning = readReasoning(response)
    if (fullText) state.text = fullText
    if (!fullReasoning) return
    if (!state.live) emitReasoning(state, fullReasoning, onReasoning)
    else if (fullReasoning.startsWith(state.live)) emitReasoning(state, fullReasoning.slice(state.live.length), onReasoning)
    state.reasoning = fullReasoning
    return
  }
  if (type === 'response.failed' || type === 'error') throw new Error('openai_failed')
}

function consumeSseBlock(
  block: string,
  state: { text: string; reasoning: string; live: string },
  onReasoning?: (delta: string) => void,
) {
  const data = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n')
  if (!data || data === '[DONE]') return
  try {
    applyEvent(JSON.parse(data) as Record<string, unknown>, state, onReasoning)
  } catch (error) {
    if (error instanceof Error && error.message === 'openai_failed') throw error
  }
}

export async function readResponseStream(
  body: ReadableStream<Uint8Array>,
  onReasoning?: (delta: string) => void,
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const state = { text: '', reasoning: '', live: '' }
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    for (const block of blocks) consumeSseBlock(block, state, onReasoning)
  }

  buffer += decoder.decode().replace(/\r\n/g, '\n')
  if (buffer.trim()) consumeSseBlock(buffer, state, onReasoning)
  return { text: state.text.trim(), reasoning: state.reasoning.trim() }
}
