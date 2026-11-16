import { PROFILE_ROLES } from '@/constants/profileOptions'
import { isAdminRole, normalizeRole } from '@/utils/adminAccess'

export function canViewWorkerRewards(role) {
  const normalized = normalizeRole(role)
  return normalized === normalizeRole(PROFILE_ROLES.user) || isAdminRole(normalized)
}

export function canReviewWorkerRewards(role) {
  return isAdminRole(role)
}
