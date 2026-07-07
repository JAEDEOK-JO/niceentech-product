import type { AttendanceRequest } from '../types/attendance'

/** 부서장 승인 대기 */
export function isDeptHeadPending(item: AttendanceRequest): boolean {
  return item.status === '대기중'
}

/** 경유 승인 대기 (부서장 승인 후, 경유 전) */
export function isGyeongyuPending(item: AttendanceRequest): boolean {
  return item.status === '부서장승인' && !item.gyeongyuBy
}

/** 최종 승인 대기 (경유 완료 후) */
export function isFinalApprovalPending(item: AttendanceRequest): boolean {
  return item.status === '부서장승인' && Boolean(item.gyeongyuBy)
}

/** 승인 완료 건의 최종 승인자 표시명 (대표이사 우선, 없으면 부서장) */
export function getFinalApproverDisplayName(item: AttendanceRequest): string | null {
  if (item.status !== '승인') return null
  return item.daepyoBy ?? item.approvedBy
}
