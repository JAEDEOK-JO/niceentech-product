import type { Employee } from '../types/attendance'
import {
  ALL_STATION_WORK_DEPARTMENTS,
  PRODUCTION_WORK_DEPARTMENTS,
  normalizeDailyWorkDepartment,
} from './dailyWorkDepartment'

export const PRODUCTION_PRESET_KEY = '__PRODUCTION__'
export const ALL_STATION_PRESET_KEY = '__STATIONS__'

export const ALL_STATION_WORK_END_PRESETS = [
  { value: '17:00', label: '전체 5시' },
  { value: '20:30', label: '전체 8시 30분' },
] as const

const PRODUCTION_DEPARTMENT_SET = new Set<string>(PRODUCTION_WORK_DEPARTMENTS)
const ALL_STATION_DEPARTMENT_SET = new Set<string>(ALL_STATION_WORK_DEPARTMENTS)

export function getWorkHourPresetDepartments(key: string): ReadonlySet<string> | null {
  if (key === PRODUCTION_PRESET_KEY) return PRODUCTION_DEPARTMENT_SET
  if (key === ALL_STATION_PRESET_KEY) return ALL_STATION_DEPARTMENT_SET
  return null
}

export function getWorkHourPresetLabel(key: string): string | null {
  if (key === PRODUCTION_PRESET_KEY) return '생산'
  if (key === ALL_STATION_PRESET_KEY) return '전체'
  return null
}

export function filterEmployeesByDepartments(
  employees: Employee[],
  departments: ReadonlySet<string>,
) {
  return employees.filter((employee) =>
    departments.has(normalizeDailyWorkDepartment(employee.assignedDepartment)),
  )
}

export function buildWorkHourSelections(
  employees: Employee[],
  time: string,
  isAbsent: (employee: Employee) => boolean,
) {
  const next = new Map<number, string>()
  for (const employee of employees) {
    if (isAbsent(employee)) continue
    next.set(employee.id, time)
  }
  return next
}
