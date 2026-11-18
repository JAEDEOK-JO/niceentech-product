import { isAdminRole, isWorkerRole } from '@/utils/adminAccess'

export function canPostNotice(role) {
  return isAdminRole(role)
}

export function canConfirmNotice(role) {
  return isWorkerRole(role)
}
