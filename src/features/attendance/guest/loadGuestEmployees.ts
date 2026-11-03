import { supabase } from '@/lib/supabase'
import type { Employee } from '../types/attendance'

const toNumber = (value: unknown) => {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

const toGuestEmployee = (raw: Record<string, unknown>): Employee => ({
  id: toNumber(raw.id),
  employeeCode: '',
  name: String(raw.name ?? ''),
  department: String(raw.department ?? ''),
  assignedDepartment: String(raw.assigned_department ?? ''),
  remainingAnnualLeaveCount: toNumber(raw.remaining_annual_leave_count),
  hourlyWage: 0,
  isFullTime: false,
  nationality: '',
  role: '',
  hireDate: raw.hire_date != null ? String(raw.hire_date) : null,
  homeLeaveStart: raw.home_leave_start != null ? String(raw.home_leave_start) : null,
  homeLeaveEnd: raw.home_leave_end != null ? String(raw.home_leave_end) : null,
  password: 0,
  createdAt: '',
})

export async function loadGuestEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id,name,department,assigned_department,remaining_annual_leave_count,hire_date,home_leave_start,home_leave_end')
    .order('department')
    .order('name')

  if (error) throw error
  return (data ?? []).map((row) => toGuestEmployee(row as Record<string, unknown>))
}
