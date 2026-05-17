import type { Employee } from '../types/attendance'

const normalizeDate = (value: string | null | undefined) => String(value ?? '').slice(0, 10)

const formatMonthDay = (value: string | null | undefined) => {
  const normalized = normalizeDate(value)
  const matched = normalized.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!matched) return ''
  return `${Number(matched[1])}월${Number(matched[2])}일`
}

export function isEmployeeOnHomeLeave(employee: Employee, workDate: string): boolean {
  const target = normalizeDate(workDate)
  const start = normalizeDate(employee.homeLeaveStart)
  const end = normalizeDate(employee.homeLeaveEnd)

  if (!target || !start) return false
  if (end && target > end) return false
  return target >= start
}

export function formatHomeLeaveLabel(employee: Employee): string {
  const start = formatMonthDay(employee.homeLeaveStart)
  const end = formatMonthDay(employee.homeLeaveEnd)
  if (start && end) return `귀국휴가(${start}~${end})`
  if (start) return `귀국휴가(${start}~)`
  return '귀국휴가'
}
