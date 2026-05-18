export const DAILY_WORK_DEPARTMENT_ORDER = ['메인관', '가지관', '나사', '용접', 'CNC', '지게차'] as const

const WELDING_GROUP_DEPARTMENTS = new Set(['치부', '포장', '용접', '페인트'])

export function normalizeDailyWorkDepartment(value: string | null | undefined) {
  const department = String(value ?? '').trim()
  if (!department) return '미지정'
  if (WELDING_GROUP_DEPARTMENTS.has(department)) return '용접'
  return department
}

export function getDailyWorkDepartmentRank(value: string | null | undefined) {
  const department = normalizeDailyWorkDepartment(value)
  const index = DAILY_WORK_DEPARTMENT_ORDER.indexOf(department as typeof DAILY_WORK_DEPARTMENT_ORDER[number])
  return index === -1 ? DAILY_WORK_DEPARTMENT_ORDER.length + 1 : index
}
