import { CAPABILITY } from '@/features/access/capabilityCatalog'
import { capabilitiesReady, hasOwnCapability, ownAttendanceScopes } from '@/features/access/userCapabilityStore'

const DEPT_HEAD_NAME = '조재덕'
const GYEONGYU_NAME = '이지형'
const FINAL_NAME = '이용필'
const SCOPED_ATTENDANCE_ADMIN_ROLE = '관리자'

/** 관리자 이름별 근태 신청 조회·부서장 승인 범위 */
const SCOPED_ATTENDANCE_DEPARTMENTS: Record<string, readonly string[]> = {
  용접반: ['용접부', 'CNC'],
  용접부: ['용접부', 'CNC'],
  메인관: ['생산부'],
  가지관: ['생산부'],
  생산부: ['생산부'],
  나사부: ['나사부'],
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
  return DEPT_HEAD_DISPLAY_BY_DEPARTMENT[normalizeName(department)] ?? DEPT_HEAD_NAME
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
  if (capabilitiesReady.value) {
    const scopes = ownAttendanceScopes()
    return scopes.length ? scopes : null
  }
  return SCOPED_ATTENDANCE_DEPARTMENTS[normalizeName(userName)] ?? null
}

export function canDeptHeadApprove(userName: string): boolean {
  if (capabilitiesReady.value) return hasOwnCapability(CAPABILITY.attendanceDeptHead)
  return normalizeName(userName) === DEPT_HEAD_NAME
}

export function canDeptHeadApproveItem(
  userName: string,
  role: string | null | undefined,
  department: string,
): boolean {
  if (canDeptHeadApprove(userName)) return true
  const scope = getScopedAttendanceDepartments(role, userName)
  if (!scope) return false
  return scope.includes(normalizeName(department))
}

export function canGyeongyuApprove(userName: string): boolean {
  if (capabilitiesReady.value) return hasOwnCapability(CAPABILITY.attendanceGyeongyu)
  const name = normalizeName(userName)
  return name === GYEONGYU_NAME || name === DEPT_HEAD_NAME
}

export function canFinalApprove(userName: string): boolean {
  if (capabilitiesReady.value) return hasOwnCapability(CAPABILITY.attendanceFinal)
  const name = normalizeName(userName)
  return name === FINAL_NAME || name === DEPT_HEAD_NAME
}

export function usesAttendanceReapply(userName: string): boolean {
  if (capabilitiesReady.value) {
    return !hasOwnCapability(CAPABILITY.attendanceDeptHead)
      && !hasOwnCapability(CAPABILITY.attendanceGyeongyu)
      && !hasOwnCapability(CAPABILITY.attendanceFinal)
  }
  const name = normalizeName(userName)
  return name !== GYEONGYU_NAME && name !== DEPT_HEAD_NAME && name !== FINAL_NAME
}

export function canManageAttendancePending(userName: string): boolean {
  return canDeptHeadApprove(userName)
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
