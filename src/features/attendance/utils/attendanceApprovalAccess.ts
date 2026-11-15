// 임시 승인 권한 (profiles.name 기준). 추후 역할/부서 기반으로 교체 예정.
export const TEMP_DEPT_HEAD_APPROVER_NAME = '조재덕'
export const TEMP_GYEONGYU_APPROVER_NAME = '이지형'
export const TEMP_FINAL_APPROVER_NAME = '이용필'
const SCOPED_ATTENDANCE_ADMIN_ROLE = '관리자'

/** 관리자 이름별 근태 신청 조회·부서장 승인 범위 */
const SCOPED_ATTENDANCE_DEPARTMENTS: Record<string, readonly string[]> = {
  용접반: ['용접부', 'CNC'],
  메인관: ['생산부'],
  가지관: ['생산부'],
}

/** 연차계 문서 부서장 표시명 (승인 권한과 별개) */
const DEPT_HEAD_DISPLAY_BY_DEPARTMENT: Record<string, string> = {
  용접부: '김동완',
  CNC: '김동완',
  CNC부: '김동완',
}

export const ATTENDANCE_APPROVAL_DENIED_MESSAGE = '승인 권한이 없습니다.'

const normalizeName = (value: string) => String(value ?? '').trim()

export function getDeptHeadDisplayName(department: string): string {
  return DEPT_HEAD_DISPLAY_BY_DEPARTMENT[normalizeName(department)] ?? TEMP_DEPT_HEAD_APPROVER_NAME
}

/** 부서장 승인 표시명 (처리상태 등). DB approved_by와 무관하게 부서별 표시명 사용 */
export function getDeptHeadApprovedByDisplay(
  item: { department?: string | null; approvedBy?: string | null },
): string | null {
  if (!normalizeName(item.approvedBy ?? '')) return null
  return getDeptHeadDisplayName(item.department ?? '')
}

export function getScopedAttendanceDepartments(
  role: string | null | undefined,
  userName: string,
): readonly string[] | null {
  if (normalizeName(role ?? '') !== SCOPED_ATTENDANCE_ADMIN_ROLE) return null
  return SCOPED_ATTENDANCE_DEPARTMENTS[normalizeName(userName)] ?? null
}

export function canDeptHeadApprove(userName: string): boolean {
  return normalizeName(userName) === TEMP_DEPT_HEAD_APPROVER_NAME
}

export function canDeptHeadApproveItem(
  userName: string,
  role: string | null | undefined,
  department: string,
): boolean {
  const name = normalizeName(userName)
  if (name === TEMP_DEPT_HEAD_APPROVER_NAME) return true
  const scope = getScopedAttendanceDepartments(role, userName)
  if (!scope) return false
  return scope.includes(normalizeName(department))
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

/** 이지형·조재덕·이용필이 아니면 반려 건은 수정 대신 재신청 */
export function usesAttendanceReapply(userName: string): boolean {
  const name = normalizeName(userName)
  return name !== TEMP_GYEONGYU_APPROVER_NAME
    && name !== TEMP_DEPT_HEAD_APPROVER_NAME
    && name !== TEMP_FINAL_APPROVER_NAME
}

/** 경유/최종승인 대기 건 수정·삭제 권한 (조재덕) */
export function canManageAttendancePending(userName: string): boolean {
  return normalizeName(userName) === TEMP_DEPT_HEAD_APPROVER_NAME
}

/** 해당 상태로 바꿀 수 있는지. 반려 복구 드롭다운과 같은 기준 */
export function canSetAttendanceStatus(
  userName: string,
  role: string | null | undefined,
  department: string,
  status: string,
): boolean {
  const next = normalizeName(status)
  if (next === '대기중') return canDeptHeadApproveItem(userName, role, department)
  if (next === '경유대기' || next === '부서장승인') return canGyeongyuApprove(userName)
  if (next === '최종대기') return canFinalApprove(userName)
  return false
}

/** 현재 단계의 반려 권한. 부서장 대기는 부서장, 경유는 경유, 최종은 최종승인 */
export function canRejectAttendanceItem(
  userName: string,
  role: string | null | undefined,
  department: string,
  status: string,
): boolean {
  return canSetAttendanceStatus(userName, role, department, status)
}
