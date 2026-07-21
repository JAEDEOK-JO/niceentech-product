export const LEAVE_TYPE_OUTING = '외출'
export const LEAVE_TYPE_ABSENCE = '결근'
export const LEAVE_TYPE_HOME = '귀국휴가'

export const LEAVE_TYPES = [
  '연차',
  '반차(오전)',
  '반차(오후)',
  LEAVE_TYPE_OUTING,
  LEAVE_TYPE_ABSENCE,
  LEAVE_TYPE_HOME,
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

export function isHomeLeaveType(leaveType: string): boolean {
  return leaveType === LEAVE_TYPE_HOME
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

export function formatLeaveDaysCountLabel(
  leaveType: string,
  daysCount: number,
  reason?: string,
): string {
  if (leaveType === LEAVE_TYPE_OUTING) return '2시간'
  if (isHomeLeaveType(leaveType)) {
    return String(reason ?? '').includes('결혼식') ? '2개월' : '1개월'
  }
  const safe = Number(daysCount ?? 0)
  if (!Number.isFinite(safe) || safe <= 0) return ''
  if (safe === 0.25) return '0.25일'
  return Number.isInteger(safe) ? `${safe}일` : `${safe.toFixed(1)}일`
}

export function getLeaveDurationHint(leaveType: string): string {
  if (isHalfDayLeaveType(leaveType)) return '반차: 0.5일 (4시간) 고정'
  if (leaveType === LEAVE_TYPE_OUTING) return '외출: 2시간 고정'
  if (leaveType === LEAVE_TYPE_ABSENCE) return '결근: 1일 단위'
  if (isHomeLeaveType(leaveType)) return '1개월 / 결혼식 2개월'
  return ''
}

/** 신청서 문서 제목: 연차계, 반차계, 귀국휴가계 등 */
export function getLeaveApplicationDocumentTitle(leaveType: string): string {
  if (isHalfDayLeaveType(leaveType)) return '반차계'
  if (leaveType === '연차') return '연차계'
  if (isHomeLeaveType(leaveType)) return '귀국휴가계'
  if (leaveType === LEAVE_TYPE_OUTING) return '외출계'
  if (leaveType === LEAVE_TYPE_ABSENCE) return '결근계'
  const label = String(leaveType ?? '').trim()
  return label ? `${label}계` : '휴가신청서'
}
