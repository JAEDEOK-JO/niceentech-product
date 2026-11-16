import { isDepartmentDeskAccount } from '@/utils/departmentDeskAccounts'

export function canManageWorkerRewards(name) {
  return !isDepartmentDeskAccount(name)
}
