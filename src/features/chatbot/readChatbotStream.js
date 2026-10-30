function readEvent(block) {
  const data = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n')
  if (!data) return null
  return JSON.parse(data)
}

export async function readChatbotStream(response, onReasoning) {
  if (!response.body) throw new Error('답변 실패')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done = false

  const take = (block) => {
    const event = readEvent(block)
    if (!event) return
    if (event.type === 'reasoning' && event.delta) onReasoning?.(String(event.delta))
    if (event.type === 'error') throw new Error(event.message || '답변 실패')
    if (event.type === 'done') done = true
  }

  while (true) {
    const { value, done: finished } = await reader.read()
    if (finished) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    for (const block of blocks) take(block)
  }

  buffer += decoder.decode().replace(/\r\n/g, '\n')
  if (buffer.trim()) take(buffer)
  if (!done) throw new Error('답변 실패')
}
