import {
  HOME_LEAVE_REASON,
  HOME_LEAVE_REASON_WEDDING,
  type AttendanceRequest,
  type Employee,
} from '../types/attendance'
import { isHomeLeaveType, LEAVE_TYPE_HOME } from './attendanceLeaveType'

export const HOME_LEAVE_DURATION_1M = '1개월' as const
export const HOME_LEAVE_DURATION_2M_WEDDING = '2개월(결혼식)' as const

export const HOME_LEAVE_DURATIONS = [
  HOME_LEAVE_DURATION_1M,
  HOME_LEAVE_DURATION_2M_WEDDING,
] as const

export type HomeLeaveDuration = (typeof HOME_LEAVE_DURATIONS)[number]

export { HOME_LEAVE_REASON as HOME_LEAVE_REASON_NORMAL, HOME_LEAVE_REASON_WEDDING }

export function isHomeLeaveWeddingReason(reason: string): boolean {
  const normalized = String(reason ?? '').trim()
  return (
    normalized === HOME_LEAVE_REASON_WEDDING ||
    normalized.includes('결혼식')
  )
}

export function getHomeLeaveDurationFromReason(reason: string): HomeLeaveDuration {
  return isHomeLeaveWeddingReason(reason)
    ? HOME_LEAVE_DURATION_2M_WEDDING
    : HOME_LEAVE_DURATION_1M
}

export function getHomeLeaveReasonForDuration(duration: HomeLeaveDuration): string {
  return duration === HOME_LEAVE_DURATION_2M_WEDDING
    ? HOME_LEAVE_REASON_WEDDING
    : HOME_LEAVE_REASON
}

export function getHomeLeaveMonths(duration: HomeLeaveDuration): 1 | 2 {
  return duration === HOME_LEAVE_DURATION_2M_WEDDING ? 2 : 1
}

const parseYmd = (value: string) => {
  const matched = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!matched) return null
  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3]),
  }
}

const formatYmd = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/** 달력 월 가산 (말일 보정) */
export function addCalendarMonths(dateStr: string, months: number): string {
  const parsed = parseYmd(dateStr)
  if (!parsed) return ''
  const base = new Date(Date.UTC(parsed.year, parsed.month - 1 + months, 1))
  const year = base.getUTCFullYear()
  const month = base.getUTCMonth() + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return formatYmd(year, month, Math.min(parsed.day, lastDay))
}

export function addCalendarYears(dateStr: string, years: number): string {
  return addCalendarMonths(dateStr, years * 12)
}

export function shiftCalendarDays(dateStr: string, days: number): string {
  const parsed = parseYmd(dateStr)
  if (!parsed) return ''
  const dt = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days))
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/** 시작일 포함 N개월 → 종료일 (예: 11/1 + 1개월 = 11/30) */
export function calcHomeLeaveEndDate(startDate: string, months: 1 | 2): string {
  const endExclusive = addCalendarMonths(startDate, months)
  if (!endExclusive) return startDate
  return shiftCalendarDays(endExclusive, -1) || startDate
}

export function formatHomeLeaveEligibleDate(dateStr: string): string {
  const parsed = parseYmd(dateStr)
  if (!parsed) return dateStr
  return `${String(parsed.year).slice(2)}.${String(parsed.month).padStart(2, '0')}.${String(parsed.day).padStart(2, '0')}`
}

export function isCountableHomeLeaveRequest(
  request: AttendanceRequest,
  excludeRequestId?: number | null,
): boolean {
  if (!isHomeLeaveType(request.leaveType)) return false
  if (request.status === '반려') return false
  if (excludeRequestId != null && request.id === excludeRequestId) return false
  return true
}

export function getLastHomeLeaveStartDate(params: {
  employee: Employee | null
  requests: AttendanceRequest[]
  excludeRequestId?: number | null
}): string | null {
  const dates: string[] = []

  const employeeStart = String(params.employee?.homeLeaveStart ?? '').slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(employeeStart)) {
    dates.push(employeeStart)
  }

  for (const request of params.requests) {
    if (!isCountableHomeLeaveRequest(request, params.excludeRequestId)) continue
    const start = String(request.startDate ?? '').slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(start)) dates.push(start)
  }

  if (dates.length === 0) return null
  return dates.sort().at(-1) ?? null
}

export function getNextHomeLeaveEligibleDate(lastStartDate: string | null): string | null {
  if (!lastStartDate) return null
  return addCalendarYears(lastStartDate, 1) || null
}

export function hasUsedHomeLeaveWedding(params: {
  requests: AttendanceRequest[]
  excludeRequestId?: number | null
}): boolean {
  return params.requests.some(
    (request) =>
      isCountableHomeLeaveRequest(request, params.excludeRequestId) &&
      isHomeLeaveWeddingReason(request.reason),
  )
}

export function isHomeLeaveStartAllowed(
  startDate: string,
  nextEligibleDate: string | null,
): boolean {
  if (!nextEligibleDate) return true
  const start = String(startDate ?? '').slice(0, 10)
  return Boolean(start) && start >= nextEligibleDate
}

export interface HomeLeaveEligibility {
  lastStartDate: string | null
  nextEligibleDate: string | null
  canApply: boolean
  canSelectOneMonth: boolean
  canSelectWedding: boolean
  weddingUsed: boolean
}

export function resolveHomeLeaveEligibility(params: {
  employee: Employee | null
  requests: AttendanceRequest[]
  startDate: string
  excludeRequestId?: number | null
}): HomeLeaveEligibility {
  const lastStartDate = getLastHomeLeaveStartDate(params)
  const nextEligibleDate = getNextHomeLeaveEligibleDate(lastStartDate)
  const canApply = isHomeLeaveStartAllowed(params.startDate, nextEligibleDate)
  const weddingUsed = hasUsedHomeLeaveWedding(params)

  return {
    lastStartDate,
    nextEligibleDate,
    canApply,
    canSelectOneMonth: true,
    canSelectWedding: !weddingUsed,
    weddingUsed,
  }
}

export function validateHomeLeaveForm(params: {
  leaveType: string
  reason: string
  startDate: string
  endDate: string
  employee: Employee | null
  requests: AttendanceRequest[]
  excludeRequestId?: number | null
}): string | null {
  if (params.leaveType !== LEAVE_TYPE_HOME) return null

  const duration = getHomeLeaveDurationFromReason(params.reason)
  const months = getHomeLeaveMonths(duration)
  const eligibility = resolveHomeLeaveEligibility(params)

  if (!eligibility.canApply) {
    const label = eligibility.nextEligibleDate
      ? formatHomeLeaveEligibleDate(eligibility.nextEligibleDate)
      : ''
    return label ? `${label} 이후 신청 가능` : '귀국휴가 신청 불가'
  }

  if (duration === HOME_LEAVE_DURATION_2M_WEDDING && eligibility.weddingUsed) {
    return '결혼식 귀국휴가는 1회만 가능'
  }

  const expectedEnd = calcHomeLeaveEndDate(params.startDate, months)
  if (params.endDate !== expectedEnd) {
    return '귀국휴가 기간을 다시 선택해주세요'
  }

  return null
}
