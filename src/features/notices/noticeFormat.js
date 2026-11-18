export function noticeWhen(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = String(date.getFullYear()).slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = date.getHours()
  const meridiem = hours < 12 ? '오전' : '오후'
  const hour = hours % 12 || 12
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}.${month}.${day} ${meridiem} ${hour}:${minute}`
}
