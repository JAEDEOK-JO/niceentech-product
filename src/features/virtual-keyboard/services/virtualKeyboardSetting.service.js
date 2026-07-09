import { supabase } from '@/lib/supabase'

export async function fetchVirtualKeyboardEnabled() {
  const { data, error } = await supabase
    .from('setting')
    .select('virtual_keyboard_enabled')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return Boolean(data?.virtual_keyboard_enabled)
}

export async function updateVirtualKeyboardEnabled(enabled) {
  const { data: row, error: fetchError } = await supabase
    .from('setting')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!row?.id) throw new Error('설정 행을 찾을 수 없습니다.')

  const nextValue = Boolean(enabled)
  const { data, error } = await supabase
    .from('setting')
    .update({ virtual_keyboard_enabled: nextValue })
    .eq('id', row.id)
    .select('virtual_keyboard_enabled')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('설정 저장 권한이 없습니다. 로그인 상태를 확인해 주세요.')
  return Boolean(data.virtual_keyboard_enabled)
}
