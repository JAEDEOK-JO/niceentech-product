import { translateToKorean } from './openai.ts'

const PART_START = '\n\n**'

function mostlyKorean(text: string) {
  const letters = text.match(/[A-Za-z가-힣]/g)?.length ?? 0
  if (!letters) return true
  return (text.match(/[가-힣]/g)?.length ?? 0) / letters >= 0.5
}

export function koreanReasoning(
  relay: { delta: (text: string) => void; gap: () => void },
  signal?: AbortSignal,
) {
  let buffer = ''
  let chain: Promise<void> = Promise.resolve()
  let parts: string[] = []

  const push = (text: string) => {
    const part = text.trim()
    if (!part) return
    const job = mostlyKorean(part) ? Promise.resolve(part) : translateToKorean(part, signal).catch(() => part)
    chain = chain.then(async () => {
      const korean = (await job).trim() || part
      parts.push(korean)
      relay.gap()
      relay.delta(korean)
    })
  }

  return {
    delta(text: string) {
      buffer += text
      let index = buffer.indexOf(PART_START, 1)
      while (index > 0) {
        push(buffer.slice(0, index))
        buffer = buffer.slice(index + 2)
        index = buffer.indexOf(PART_START, 1)
      }
    },
    async flush() {
      push(buffer)
      buffer = ''
      await chain
      const text = parts.join('\n\n')
      parts = []
      return text
    },
  }
}
