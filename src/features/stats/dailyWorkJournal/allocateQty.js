import { addDays, getInclusiveDayCount, isSameDay, startOfDay } from './dates'
import { roundToOneDecimal } from '@/features/main/productionPlanNumbers'

function toDayList(startDate, endDate) {
  const start = startOfDay(startDate)
  const end = startOfDay(endDate)
  if (end.getTime() < start.getTime()) return [end]
  const count = getInclusiveDayCount(start, end)
  return Array.from({ length: count }, (_, index) => addDays(start, index))
}

function splitUnits(totalUnits, dayCount) {
  const n = Math.max(1, dayCount)
  const units = Math.max(0, Math.floor(totalUnits))
  const base = Math.floor(units / n)
  const remainder = units % n
  return Array.from({ length: n }, (_, index) => base + (index >= n - remainder ? 1 : 0))
}

export function qtyOnDate(total, startDate, endDate, targetDate) {
  if (!endDate || !targetDate) return 0
  const spanStart = startDate ?? endDate
  const days = toDayList(spanStart, endDate)
  const index = days.findIndex((date) => isSameDay(date, targetDate))
  if (index < 0) return 0
  return splitUnits(total, days.length)[index] ?? 0
}

export function decimalOnDate(total, startDate, endDate, targetDate, scale = 10) {
  if (!endDate || !targetDate) return 0
  const spanStart = startDate ?? endDate
  const days = toDayList(spanStart, endDate)
  const index = days.findIndex((date) => isSameDay(date, targetDate))
  if (index < 0) return 0
  const units = Math.round(Number(total || 0) * scale)
  return roundToOneDecimal((splitUnits(units, days.length)[index] ?? 0) / scale)
}

export function isDateInSpan(startDate, endDate, targetDate) {
  if (!endDate || !targetDate) return false
  const spanStart = startDate ?? endDate
  const start = startOfDay(spanStart)
  const end = startOfDay(endDate)
  const target = startOfDay(targetDate)
  const from = start.getTime() <= end.getTime() ? start : end
  const to = start.getTime() <= end.getTime() ? end : start
  return target.getTime() >= from.getTime() && target.getTime() <= to.getTime()
}
