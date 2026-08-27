export const formatIsoDate = (date = new Date()) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const formatKoreanDate = (date = new Date()) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일`
}

/** 생산계획표와 동일: 오늘이 화요일이면 다음 화요일 */
export const getBaseTuesday = (now = new Date()) => {
  const daysUntilTuesday = ((2 - now.getDay() + 7) % 7) || 7
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  base.setDate(base.getDate() + daysUntilTuesday)
  base.setHours(0, 0, 0, 0)
  return base
}

export const addWeeks = (date, weeks) => {
  const next = new Date(date)
  next.setDate(next.getDate() + weeks * 7)
  next.setHours(0, 0, 0, 0)
  return next
}
