import { CAPABILITY } from '@/features/access/capabilityCatalog'
import { capabilitiesReady, hasOwnCapability } from '@/features/access/userCapabilityStore'
import { PROFILE_ROLES } from '@/constants/profileOptions'
import { isAdminRole, normalizeRole } from '@/utils/adminAccess'
import { isDepartmentDeskName } from '@/utils/departmentDeskAccounts'

export function canViewWorkerRewards(role) {
  const normalized = normalizeRole(role)
  return normalized === normalizeRole(PROFILE_ROLES.user) || isAdminRole(normalized)
}

export function canReviewWorkerRewards(role, name) {
  if (capabilitiesReady.value) {
    if (hasOwnCapability(CAPABILITY.rewardReviewDenied)) return false
  } else if (isDepartmentDeskName(name)) {
    return false
  }
  return isAdminRole(role)
}
