export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function isSameDay(left, right) {
  return startOfDay(left).getTime() === startOfDay(right).getTime()
}

export function formatIsoDate(date) {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatMonthDay(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}.${day}`
}

export function formatWorkerDate(date) {
  const year = String(date.getFullYear()).slice(2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export function formatDayLabel(date) {
  return `${formatMonthDay(date)} (${WEEKDAY_LABELS[date.getDay()]})`
}

export function formatKoreanDate(date) {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일`
}

export function parseIsoDateParam(value) {
  const raw = String(Array.isArray(value) ? value[0] : value ?? '').trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  if (Number.isNaN(parsed.getTime())) return null
  return startOfDay(parsed)
}

export function parseFlexibleDate(value, referenceDate = new Date()) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const isoMatched = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatched) {
    const [, year, month, day] = isoMatched
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed)
  }

  const yearMatched = raw.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})/)
  if (yearMatched) {
    const [, year, month, day] = yearMatched
    const parsed = new Date(2000 + Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed)
  }

  const monthMatched = raw.match(/^(\d{1,2})\.(\d{1,2})$/)
  if (!monthMatched) return null
  const [, month, day] = monthMatched
  const parsed = new Date(referenceDate.getFullYear(), Number(month) - 1, Number(day))
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed)
}

export function getInclusiveDayCount(startDate, endDate) {
  return Math.floor((startOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / 86400000) + 1
}

export function getWeekMonday(date) {
  const base = startOfDay(date)
  const day = base.getDay()
  const diff = day === 0 ? -6 : 1 - day
  base.setDate(base.getDate() + diff)
  return base
}

export function getWeekDates(date) {
  const monday = getWeekMonday(date)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export function getInspectionTuesday(date) {
  const base = startOfDay(date)
  const daysUntilTuesday = ((2 - base.getDay() + 7) % 7) || 7
  base.setDate(base.getDate() + daysUntilTuesday)
  return base
}
