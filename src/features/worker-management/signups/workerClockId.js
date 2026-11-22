import { supabase } from '@/lib/supabase'
import { PROFILE_ROLES } from '@/constants/profileOptions'

export function normalizeClockId(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8)
  if (!digits) return null
  return digits.padStart(8, '0')
}

export async function saveWorkerClockIds(rows) {
  for (const row of rows) {
    const { error } = await supabase
      .from('profiles')
      .update({ employee_code: normalizeClockId(row.employeeCode) })
      .eq('id', row.id)
      .eq('role', PROFILE_ROLES.worker)
    if (error?.code === '23505') throw new Error('이미 있는 사번입니다.')
    if (error) throw error
  }
}
