const DEPARTMENT_DESK_ACCOUNTS = new Set(['생산부', '용접부', '나사부'])

export function isDepartmentDeskAccount(name) {
  const normalized = String(name ?? '').replaceAll(' ', '').trim()
  return DEPARTMENT_DESK_ACCOUNTS.has(normalized)
}
