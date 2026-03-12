export const normalizeWorkMan = (value) => String(value ?? '').replaceAll(' ', '').trim()

export const normalizeDepartment = (value) => String(value ?? '').replaceAll(' ', '').trim()

export const normalizeRole = (value) => String(value ?? '').replaceAll(' ', '').trim()

export const isAdminWorkMan = (value) => {
  const normalized = normalizeWorkMan(value)
  if (!normalized) return false
  return normalized.includes(normalizeWorkMan('관리자')) || normalized.includes(normalizeWorkMan('전체'))
}

export const isAdminRole = (value) => {
  const normalized = normalizeRole(value)
  if (!normalized) return false
  return normalized.includes(normalizeRole('관리자'))
}

export const isDesignDepartment = (value) => {
  const normalized = normalizeDepartment(value)
  if (!normalized) return false
  return normalized.includes(normalizeDepartment('설계'))
}
