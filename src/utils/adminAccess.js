export const normalizeWorkMan = (value) => String(value ?? '').replaceAll(' ', '').trim()

export const normalizeDepartment = (value) => String(value ?? '').replaceAll(' ', '').trim()

export const normalizeRole = (value) => String(value ?? '').replaceAll(' ', '').trim()

// 슈퍼 관리자: admin만 접근 가능한 페이지 (관리자도 못 보는 페이지)
export const isRootAdmin = (value) => {
  const normalized = normalizeRole(value)
  if (!normalized) return false
  return normalized.toLowerCase() === 'admin'
}

// 일반 관리자: 관리자 + admin 둘 다 통과
export const isAdminRole = (value) => {
  const normalized = normalizeRole(value)
  if (!normalized) return false
  return normalized.includes(normalizeRole('관리자')) || isRootAdmin(normalized)
}

// 공정 전체 제어 권한: 관리자 + 현장관리자
// 어드민 대시보드 접근은 isAdminRole(관리자만)로 별도 체크
export const isProductionAdmin = (value) => {
  const normalized = normalizeRole(value)
  if (!normalized) return false
  return isAdminRole(normalized) || normalized.includes(normalizeRole('현장관리자'))
}

export const isDesignDepartment = (value) => {
  const normalized = normalizeDepartment(value)
  if (!normalized) return false
  return normalized.includes(normalizeDepartment('설계'))
}
