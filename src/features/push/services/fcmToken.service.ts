import { supabase } from '@/lib/supabase'

export async function upsertFcmToken(token: string, deviceLabel?: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.id) {
    throw new Error('로그인이 필요합니다.')
  }

  const { error } = await supabase.from('fcm_tokens').upsert(
    {
      user_id: user.id,
      token,
      device_label: deviceLabel ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  )

  if (error) throw error
}

export async function deleteFcmToken(token: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id || !token) return

  await supabase.from('fcm_tokens').delete().eq('user_id', user.id).eq('token', token)
}
