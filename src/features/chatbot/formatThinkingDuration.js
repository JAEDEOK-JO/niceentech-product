export function formatThinkingDuration(ms) {
  const total = Math.max(0, Math.round(Number(ms) / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes > 0) return `${minutes}분 ${seconds}초`
  return `${seconds}초`
}
