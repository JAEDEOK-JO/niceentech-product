import { supabase } from '@/lib/supabase'
import { PROFILE_ROLES } from '@/constants/profileOptions'
import { attachWorkerLeave } from './workerAnnualLeave'
import { normalizeClockId } from './workerClockId'

async function ensureFreshSession() {
  const { data } = await supabase.auth.getSession()
  const expiresAt = data.session?.expires_at ?? 0
  if (!data.session || expiresAt * 1000 - Date.now() < 60_000) {
    await supabase.auth.refreshSession()
  }
}

function failed(error, fallback) {
  if (String(error?.message ?? '').includes('approval_forbidden')) {
    return { ok: false, message: '승인 권한이 없습니다.' }
  }
  return { ok: false, message: fallback }
}

export async function fetchWorkerSignups() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,email,assigned_department,activate,created_at,employee_code')
    .eq('role', PROFILE_ROLES.worker)
    .order('created_at', { ascending: false })

  if (error) throw error
  return attachWorkerLeave(data ?? [])
}

export async function approveWorkerSignup(id) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ activate: true })
    .eq('id', id)
    .eq('role', PROFILE_ROLES.worker)
    .eq('activate', false)
    .select('id')

  if (error) return failed(error, '승인에 실패했습니다.')
  if (!data?.length) return { ok: false, message: '승인에 실패했습니다.' }
  return { ok: true }
}

export async function updateWorkerSignup(id, { name, assignedDepartment, employeeCode }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      name,
      assigned_department: assignedDepartment || null,
      department: assignedDepartment || null,
      employee_code: normalizeClockId(employeeCode),
    })
    .eq('id', id)
    .eq('role', PROFILE_ROLES.worker)
    .select('id,name,assigned_department,employee_code')

  if (error?.code === '23505') return { ok: false, message: '이미 있는 사번입니다.' }
  if (error || !data?.length) return { ok: false, message: '저장에 실패했습니다.' }
  return { ok: true, item: data[0] }
}

export async function deleteWorkerSignup(id) {
  await ensureFreshSession()
  const { data, error } = await supabase.functions.invoke('approve-worker', {
    body: { id, action: 'delete' },
  })

  if (error) {
    let detail = null
    try {
      detail = await error.context?.json?.()
    } catch {
      detail = null
    }
    const code = detail?.error || data?.error
    if (code === 'forbidden') return { ok: false, message: '삭제 권한이 없습니다.' }
    return { ok: false, message: '삭제에 실패했습니다.' }
  }

  if (data?.error) return { ok: false, message: '삭제에 실패했습니다.' }
  return { ok: true }
}
