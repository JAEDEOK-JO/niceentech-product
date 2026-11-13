import { supabase } from '@/lib/supabase'

export async function fetchWorkerDepartments() {
  const { data, error } = await supabase.functions.invoke('register-worker', { method: 'GET' })
  const departments = Array.isArray(data?.departments)
    ? data.departments.map((value) => String(value ?? '').trim()).filter(Boolean)
    : []

  if (error || data?.error || departments.length === 0) {
    return { ok: false, departments: [], message: '담당부서를 불러오지 못했습니다.' }
  }

  return { ok: true, departments, message: '' }
}
