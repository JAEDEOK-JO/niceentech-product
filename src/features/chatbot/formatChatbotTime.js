export function formatChatbotTime(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return ''
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${yy}.${mm}.${dd} ${date.getHours()}:${minutes}`
}
