import { supabase } from '@/lib/supabase'

export async function registerEmployeeAccount(payload) {
  const emailId = String(payload.emailId ?? payload.email ?? '').trim().replace(/@niceentech\.kr$/i, '')
  const { data, error } = await supabase.functions.invoke('register-employee', {
    body: {
      email: `${emailId}@niceentech.kr`,
      password: String(payload.password ?? ''),
      name: String(payload.name ?? '').trim(),
      department: String(payload.department ?? '').trim(),
      position: String(payload.position ?? '').trim(),
      role: String(payload.role ?? '').trim(),
      work_man: String(payload.workMan ?? '').trim(),
      phone: String(payload.phone ?? '').replace(/\D/g, ''),
      activate: Boolean(payload.activate ?? true),
    },
  })

  if (error) {
    let detail = null
    try {
      detail = await error.context?.json?.()
    } catch {
      detail = null
    }
    if (detail?.error) {
      const err = new Error(detail.error)
      err.detail = detail
      throw err
    }
    throw error
  }
  if (data?.error) {
    const err = new Error(data.error)
    err.detail = data
    throw err
  }
  return data
}
