import { supabase } from '@/lib/supabase'

export type PushRecipientRow = {
  userId: string
  name: string
  department: string
  role: string
  drawingEnabled: boolean
  hasToken: boolean
}

export async function fetchPushRecipientRows(): Promise<PushRecipientRow[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,name,department,role,activate')
    .eq('activate', true)
    .order('name')

  if (profilesError) throw profilesError

  const [{ data: settings, error: settingsError }, { data: tokens, error: tokensError }] = await Promise.all([
    supabase.from('push_recipient_settings').select('user_id,drawing_enabled'),
    supabase.from('fcm_tokens').select('user_id'),
  ])

  if (settingsError) throw settingsError
  if (tokensError) throw tokensError

  const settingsByUser = new Map(
    (settings ?? []).map((row) => [String(row.user_id), Boolean(row.drawing_enabled)]),
  )
  const tokenUsers = new Set((tokens ?? []).map((row) => String(row.user_id)))

  const rows = (profiles ?? []).map((profile) => {
    const userId = String(profile.id)
    return {
      userId,
      name: String(profile.name ?? '').trim() || '-',
      department: String(profile.department ?? '').trim(),
      role: String(profile.role ?? '').trim(),
      drawingEnabled: settingsByUser.has(userId) ? Boolean(settingsByUser.get(userId)) : true,
      hasToken: tokenUsers.has(userId),
    }
  })

  rows.sort((a, b) => {
    const dept = a.department.localeCompare(b.department, 'ko')
    if (dept !== 0) return dept
    return a.name.localeCompare(b.name, 'ko')
  })

  return rows
}

export async function setDrawingPushEnabled(userId: string, enabled: boolean) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('push_recipient_settings').upsert(
    {
      user_id: userId,
      drawing_enabled: enabled,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    },
    { onConflict: 'user_id' },
  )

  if (error) throw error
}
