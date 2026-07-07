import type { AttendanceRequest } from '../types/attendance'

export const ATTENDANCE_WORKFLOW_STATUS = {
  PENDING: '대기중',
  GYEONGYU_PENDING: '경유대기',
  FINAL_PENDING: '최종대기',
  LEGACY_DEPT_APPROVED: '부서장승인',
  APPROVED: '승인',
  REJECTED: '반려',
} as const

const hasGyeongyuApproval = (item: AttendanceRequest) =>
  Boolean(String(item.gyeongyuBy ?? '').trim()) && Boolean(String(item.gyeongyuAt ?? '').trim())

/** 부서장 승인 대기 */
export function isDeptHeadPending(item: AttendanceRequest): boolean {
  return item.status === ATTENDANCE_WORKFLOW_STATUS.PENDING
}

/** 경유 승인 대기 */
export function isGyeongyuPending(item: AttendanceRequest): boolean {
  if (item.status === ATTENDANCE_WORKFLOW_STATUS.GYEONGYU_PENDING) return true
  return item.status === ATTENDANCE_WORKFLOW_STATUS.LEGACY_DEPT_APPROVED && !hasGyeongyuApproval(item)
}

/** 최종 승인 대기 (경유 승인 후에만) */
export function isFinalApprovalPending(item: AttendanceRequest): boolean {
  return item.status === ATTENDANCE_WORKFLOW_STATUS.FINAL_PENDING
}

export function isDeptHeadApproved(item: AttendanceRequest): boolean {
  return (
    item.status === ATTENDANCE_WORKFLOW_STATUS.GYEONGYU_PENDING ||
    item.status === ATTENDANCE_WORKFLOW_STATUS.FINAL_PENDING ||
    item.status === ATTENDANCE_WORKFLOW_STATUS.LEGACY_DEPT_APPROVED ||
    item.status === ATTENDANCE_WORKFLOW_STATUS.APPROVED
  )
}

/** 승인 완료 건의 최종 승인자 표시명 (대표이사 우선, 없으면 부서장) */
export function getFinalApproverDisplayName(item: AttendanceRequest): string | null {
  if (item.status !== ATTENDANCE_WORKFLOW_STATUS.APPROVED) return null
  return item.daepyoBy ?? item.approvedBy
}
