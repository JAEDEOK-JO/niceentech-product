import { supabase } from '@/lib/supabase'

export type PushRecipientRow = {
  userId: string
  name: string
  department: string
  role: string
  hasToken: boolean
}

export async function fetchPushRecipientRows(): Promise<PushRecipientRow[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,name,department,role,activate')
    .eq('activate', true)
    .order('name')

  if (profilesError) throw profilesError

  const { data: tokens, error: tokensError } = await supabase.from('fcm_tokens').select('user_id')

  if (tokensError) throw tokensError

  const tokenUsers = new Set((tokens ?? []).map((row) => String(row.user_id)))

  const rows = (profiles ?? []).map((profile) => {
    const userId = String(profile.id)
    return {
      userId,
      name: String(profile.name ?? '').trim() || '-',
      department: String(profile.department ?? '').trim(),
      role: String(profile.role ?? '').trim(),
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
