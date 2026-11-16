import { supabase } from '@/lib/supabase'
import { PROFILE_ROLES } from '@/constants/profileOptions'

export async function fetchPendingWorkers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,assigned_department,created_at')
    .eq('role', PROFILE_ROLES.worker)
    .eq('activate', false)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

async function ensureFreshSession() {
  const { data } = await supabase.auth.getSession()
  const expiresAt = data.session?.expires_at ?? 0
  if (!data.session || expiresAt * 1000 - Date.now() < 60_000) {
    await supabase.auth.refreshSession()
  }
}

export async function approveWorker(id) {
  await ensureFreshSession()
  const { data, error } = await supabase.functions.invoke('approve-worker', {
    body: { id },
  })

  if (error) {
    let detail = null
    try {
      detail = await error.context?.json?.()
    } catch {
      detail = null
    }
    const code = detail?.error || data?.error
    if (code === 'forbidden') return { ok: false, message: '승인 권한이 없습니다.' }
    return { ok: false, message: '승인에 실패했습니다.' }
  }

  if (data?.error) {
    return { ok: false, message: data.error === 'forbidden' ? '승인 권한이 없습니다.' : '승인에 실패했습니다.' }
  }

  return { ok: true }
}
