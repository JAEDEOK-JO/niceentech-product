import { isDepartmentDeskAccount } from '@/utils/departmentDeskAccounts'

export function attendanceHeading(name, scopedDepartments) {
  const account = String(name ?? '').replaceAll(' ', '').trim()
  if (isDepartmentDeskAccount(account)) return `${account} 근태관리`
  if (scopedDepartments?.length === 1) return `${scopedDepartments[0]} 근태관리`
  return '근태관리'
}
