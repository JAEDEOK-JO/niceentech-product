// 임시 승인 권한 (profiles.name 기준). 추후 역할/부서 기반으로 교체 예정.
export const TEMP_DEPT_HEAD_APPROVER_NAME = '조재덕'
export const TEMP_GYEONGYU_APPROVER_NAME = '이지형'
export const TEMP_FINAL_APPROVER_NAME = '이용필'

export const ATTENDANCE_APPROVAL_DENIED_MESSAGE = '승인 권한이 없습니다.'

const normalizeName = (value: string) => String(value ?? '').trim()

export function canDeptHeadApprove(userName: string): boolean {
  return normalizeName(userName) === TEMP_DEPT_HEAD_APPROVER_NAME
}

/** 경유 권한: 이지형 + 조재덕(전체 권한) */
export function canGyeongyuApprove(userName: string): boolean {
  const name = normalizeName(userName)
  return name === TEMP_GYEONGYU_APPROVER_NAME || name === TEMP_DEPT_HEAD_APPROVER_NAME
}

/** 최종승인 권한: 이용필 + 조재덕(전체 권한) */
export function canFinalApprove(userName: string): boolean {
  const name = normalizeName(userName)
  return name === TEMP_FINAL_APPROVER_NAME || name === TEMP_DEPT_HEAD_APPROVER_NAME
}

/** 경유/최종승인 대기 건 수정·삭제 권한 (조재덕) */
export function canManageAttendancePending(userName: string): boolean {
  return normalizeName(userName) === TEMP_DEPT_HEAD_APPROVER_NAME
}
