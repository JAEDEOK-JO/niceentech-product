import { isAdminRole, isDesignDepartment } from '@/utils/adminAccess'

export function canManageCnc(profile: { role?: string; department?: string } | null | undefined): boolean {
  if (!profile) return false
  return isAdminRole(profile.role) || isDesignDepartment(profile.department)
}
