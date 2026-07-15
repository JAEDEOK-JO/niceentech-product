const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const normalizeText = (value) => String(value ?? '').trim()

export const isCompletedStatus = (value) => {
  const text = normalizeText(value)
  return text.includes('작업완료') || text.includes('출하완료')
}

export const isProductionCompleted = (row) =>
  Boolean(row?.complete) ||
  Boolean(row?.shipment) ||
  isCompletedStatus(row?.worker_t) ||
  isCompletedStatus(row?.worker_nasa) ||
  isCompletedStatus(row?.worker_main) ||
  isCompletedStatus(row?.worker_welding)

export const parseFlexibleDate = (value, fallbackYear = new Date().getFullYear()) => {
  const raw = normalizeText(value)
  if (!raw) return null

  const koreanFull = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (koreanFull) {
    const [, year, month, day] = koreanFull
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const monthDay = raw.match(/(\d{1,2})\D+(\d{1,2})/)
  if (monthDay && !raw.includes(':')) {
    const [, month, day] = monthDay
    const parsed = new Date(fallbackYear, Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const native = new Date(raw)
  return Number.isNaN(native.getTime()) ? null : native
}

export const parseDrawingDateTime = (value) => {
  if (!value) return null
  const native = new Date(value)
  return Number.isNaN(native.getTime()) ? null : native
}

/** 해당 주 목요일 12시 이후 배포면 true (금~일 포함) */
export const isAfterThursdayNoon = (date) => {
  if (!date) return false
  const day = date.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  const thursdayNoon = new Date(date)
  thursdayNoon.setHours(0, 0, 0, 0)
  thursdayNoon.setDate(thursdayNoon.getDate() - daysFromMonday + 3)
  thursdayNoon.setHours(12, 0, 0, 0)
  return date.getTime() > thursdayNoon.getTime()
}

/**
 * 배포 집계용 유효 여부.
 * 검수일이 배포연도보다 과거면(예: 2025 검수 + 2026 배포) 제외.
 */
export const isValidDrawingForReport = (row, drawingDate) => {
  if (!drawingDate) return false
  const testDate = parseFlexibleDate(row?.test_date, drawingDate.getFullYear())
  if (!testDate) return true
  return testDate.getFullYear() >= drawingDate.getFullYear()
}

export const getLatestClosedHalf = (now = new Date()) => {
  if (now.getMonth() >= 6) return { year: now.getFullYear(), half: 1 }
  return { year: now.getFullYear() - 1, half: 2 }
}

export const buildHalfMonths = (year, half) => {
  const startMonthIndex = half === 1 ? 0 : 6
  return Array.from({ length: 6 }, (_, i) => {
    const monthIndex = startMonthIndex + i
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
    const lastDay = new Date(year, monthIndex + 1, 0).getDate()
    return {
      key: monthKey,
      label: `${monthIndex + 1}월`,
      year,
      monthIndex,
      monthValue: `${monthKey}-01`,
      monthEndValue: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
    }
  })
}

export const isDateInMonth = (date, month) =>
  Boolean(date) && date.getFullYear() === month.year && date.getMonth() === month.monthIndex

export const isDateInHalf = (date, year, half) => {
  if (!date || date.getFullYear() !== year) return false
  const m = date.getMonth()
  return half === 1 ? m < 6 : m >= 6
}

export const sumHeadQty = (rows) =>
  rows.reduce((sum, row) => sum + toNumber(row?.head), 0)

export { toNumber, normalizeText }
