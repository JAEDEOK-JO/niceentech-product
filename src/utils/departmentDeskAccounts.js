import { CAPABILITY } from '@/features/access/capabilityCatalog'
import { capabilitiesReady, hasOwnCapability } from '@/features/access/userCapabilityStore'

const DEPARTMENT_DESK_ACCOUNTS = new Set(['생산부', '용접부', '나사부'])

export function isDepartmentDeskName(name) {
  const normalized = String(name ?? '').replaceAll(' ', '').trim()
  return DEPARTMENT_DESK_ACCOUNTS.has(normalized)
}

export function isDepartmentDeskAccount(name) {
  if (capabilitiesReady.value) return hasOwnCapability(CAPABILITY.departmentDesk)
  return isDepartmentDeskName(name)
}
