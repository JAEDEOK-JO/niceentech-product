import { supabase } from '@/lib/supabase'

const messages = {
  duplicate_email: '이미 등록된 아이디입니다.',
  invalid_input: '입력값을 확인해주세요.',
  create_user_failed: '가입에 실패했습니다.',
  profile_insert_failed: '가입에 실패했습니다.',
  missing_config: '가입에 실패했습니다.',
}

export async function registerWorker(payload) {
  const emailId = String(payload.id ?? '').trim()
  const password = String(payload.password ?? '')
  const name = String(payload.name ?? '').trim()
  const assignedDepartment = String(payload.assignedDepartment ?? '').trim()

  if (!emailId || password.length < 6 || !name || !assignedDepartment) {
    return { ok: false, message: messages.invalid_input }
  }

  const { data, error } = await supabase.functions.invoke('register-worker', {
    body: {
      emailId,
      password,
      name,
      assignedDepartment,
    },
  })

  if (error) {
    let detail = null
    try {
      detail = await error.context?.json?.()
    } catch {
      detail = null
    }
    const code = detail?.error || data?.error
    return { ok: false, message: messages[code] ?? '가입에 실패했습니다.' }
  }

  if (data?.error) {
    return { ok: false, message: messages[data.error] ?? '가입에 실패했습니다.' }
  }

  return { ok: true }
}
