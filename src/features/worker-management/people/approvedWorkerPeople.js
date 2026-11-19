import { supabase } from '@/lib/supabase'
import { PROFILE_ROLES } from '@/constants/profileOptions'
import { normalizeWorkerDepartment } from '@/features/worker/workerDepartmentOptions'

function personDepartment(row) {
  return normalizeWorkerDepartment(row.assigned_department || row.department) || String(row.assigned_department || row.department || '').trim()
}

export function mapApprovedWorkerPerson(row) {
  const department = personDepartment(row)
  return {
    id: String(row.id),
    name: String(row.name ?? '').trim(),
    department,
    assignedDepartment: department,
    remainingAnnualLeaveCount: 0,
    isFullTime: true,
    hireDate: null,
    homeLeaveStart: null,
    homeLeaveEnd: null,
  }
}

export async function fetchApprovedWorkerPeople() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,department,assigned_department,activate')
    .eq('role', PROFILE_ROLES.worker)
    .order('name')

  if (error) throw error
  return (data ?? [])
    .filter((row) => row.activate !== false && String(row.name ?? '').trim())
    .map(mapApprovedWorkerPerson)
}
