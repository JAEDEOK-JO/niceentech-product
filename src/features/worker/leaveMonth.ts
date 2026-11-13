import type { AttendanceRequest } from '@/features/attendance/types/attendance'

export function shiftLeaveMonth(offset: number, delta: number) {
  return Math.min(0, offset + delta)
}

const toIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function leaveMonthDate(offset: number, today = new Date()) {
  return new Date(today.getFullYear(), today.getMonth() + offset, 1)
}

export function leaveMonthLabel(offset: number, today = new Date()) {
  const date = leaveMonthDate(offset, today)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 신청현황`
}

export function leaveMonthRange(offset: number, today = new Date()) {
  const start = leaveMonthDate(offset, today)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  return { start: toIsoDate(start), end: toIsoDate(end) }
}

export function requestOverlapsLeaveMonth(
  item: Pick<AttendanceRequest, 'startDate' | 'endDate'>,
  offset: number,
  today = new Date(),
) {
  const range = leaveMonthRange(offset, today)
  const start = item.startDate.slice(0, 10)
  const end = (item.endDate || item.startDate).slice(0, 10)
  if (!start) return false
  return start <= range.end && end >= range.start
}
