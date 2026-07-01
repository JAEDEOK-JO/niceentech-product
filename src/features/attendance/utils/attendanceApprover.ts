import type { AttendanceRequest } from '../types/attendance'

/** 승인 완료 건의 최종 승인자 표시명 (대표이사 우선, 없으면 부서장) */
export function getFinalApproverDisplayName(item: AttendanceRequest): string | null {
  if (item.status !== '승인') return null
  return item.daepyoBy ?? item.approvedBy
}
