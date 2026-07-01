import type { Employee } from '../types/attendance'

export const PRODUCTION_DEPARTMENT = '생산부'
export const PRODUCTION_DEPARTMENT_PASSWORD = 1260

export function getDefaultPasswordForDepartment(department: string): number {
  return department === PRODUCTION_DEPARTMENT ? PRODUCTION_DEPARTMENT_PASSWORD : 0
}

export function resolveEmployeePassword(employee: Pick<Employee, 'department' | 'password'>): number {
  if (employee.department === PRODUCTION_DEPARTMENT) return PRODUCTION_DEPARTMENT_PASSWORD
  return Math.max(0, Math.floor(Number(employee.password) || 0))
}

export function normalizeEmployeePassword(department: string, password: number): number {
  if (department === PRODUCTION_DEPARTMENT) return PRODUCTION_DEPARTMENT_PASSWORD
  return Math.max(0, Math.floor(Number(password) || 0))
}
