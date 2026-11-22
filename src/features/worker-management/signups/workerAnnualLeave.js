import { supabase } from '@/lib/supabase'

function leaveYear() {
  return new Date().getFullYear()
}

function leaveNumber(value) {
  const days = Number(value)
  if (!Number.isFinite(days) || days < 0) return null
  return Math.round(days * 2) / 2
}

export function workerLeaveRemaining(total, used) {
  return Math.max(0, Number(total) - Number(used))
}

export async function attachWorkerLeave(rows) {
  const people = rows ?? []
  if (people.length === 0) return []
  const { data, error } = await supabase
    .from('attendance_annual_quota')
    .select('user_id,total_days,used_days')
    .eq('year', leaveYear())
    .in('user_id', people.map((row) => row.id))

  if (error) throw error
  const byUser = new Map((data ?? []).map((row) => [row.user_id, row]))
  return people.map((row) => {
    const quota = byUser.get(row.id)
    return {
      ...row,
      remainingAnnualLeave: quota ? workerLeaveRemaining(quota.total_days, quota.used_days) : 0,
    }
  })
}

export async function saveWorkerLeave(person, remaining) {
  const days = leaveNumber(remaining)
  if (days == null) return { ok: false, message: '연차를 입력해 주세요.' }

  const year = leaveYear()
  const name = String(person.name ?? '').trim()
  const department = String(person.assignedDepartment || person.assigned_department || person.department || '').trim()
  const { data: existing, error: readError } = await supabase
    .from('attendance_annual_quota')
    .select('id,used_days')
    .eq('user_id', person.id)
    .eq('year', year)
    .maybeSingle()

  if (readError) return { ok: false, message: '저장에 실패했습니다.' }

  if (existing) {
    const { error } = await supabase
      .from('attendance_annual_quota')
      .update({
        total_days: Number(existing.used_days) + days,
        user_name: name,
        department,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) return { ok: false, message: '저장에 실패했습니다.' }
    return { ok: true, remainingAnnualLeave: days }
  }

  const { error } = await supabase.from('attendance_annual_quota').insert({
    user_id: person.id,
    user_name: name,
    department,
    year,
    total_days: days,
    used_days: 0,
  })
  if (error) return { ok: false, message: '저장에 실패했습니다.' }
  return { ok: true, remainingAnnualLeave: days }
}
