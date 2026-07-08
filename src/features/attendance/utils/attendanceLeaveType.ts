export const LEAVE_TYPE_OUTING = '외출'
export const LEAVE_TYPE_ABSENCE = '결근'

export const LEAVE_TYPES = [
  '연차',
  '반차(오전)',
  '반차(오후)',
  LEAVE_TYPE_OUTING,
  LEAVE_TYPE_ABSENCE,
  '기타',
] as const

export type LeaveType = (typeof LEAVE_TYPES)[number]

const FIXED_LEAVE_DAYS: Record<string, number> = {
  '반차(오전)': 0.5,
  '반차(오후)': 0.5,
  [LEAVE_TYPE_OUTING]: 0.25,
}

export function isHalfDayLeaveType(leaveType: string): boolean {
  return leaveType === '반차(오전)' || leaveType === '반차(오후)'
}

export function isSingleDayLeaveType(leaveType: string): boolean {
  return isHalfDayLeaveType(leaveType) || leaveType === LEAVE_TYPE_OUTING
}

export function getFixedLeaveDaysCount(leaveType: string): number | null {
  const value = FIXED_LEAVE_DAYS[leaveType]
  return value == null ? null : value
}

export function deductsAnnualLeave(leaveType: string): boolean {
  return leaveType === '연차' || isHalfDayLeaveType(leaveType)
}

export function formatLeaveDaysCountLabel(leaveType: string, daysCount: number): string {
  if (leaveType === LEAVE_TYPE_OUTING) return '2시간'
  const safe = Number(daysCount ?? 0)
  if (!Number.isFinite(safe) || safe <= 0) return ''
  if (safe === 0.25) return '0.25일'
  return Number.isInteger(safe) ? `${safe}일` : `${safe.toFixed(1)}일`
}

export function getLeaveDurationHint(leaveType: string): string {
  if (isHalfDayLeaveType(leaveType)) return '반차: 0.5일 (4시간) 고정'
  if (leaveType === LEAVE_TYPE_OUTING) return '외출: 0.25일 (2시간) 고정'
  if (leaveType === LEAVE_TYPE_ABSENCE) return '결근: 1일 단위'
  return ''
}
