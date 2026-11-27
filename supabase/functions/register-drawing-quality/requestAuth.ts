import type { SupabaseClient } from 'npm:@supabase/supabase-js'

export async function isWebhook(supabase: SupabaseClient, req: Request) {
  const header = String(req.headers.get('x-drawing-quality-secret') ?? '')
  if (!header) return false

  const { data, error } = await supabase
    .from('system_push_config')
    .select('value')
    .eq('key', 'drawing_quality_webhook_secret')
    .maybeSingle()

  if (error || !data?.value) return false
  return data.value === header
}

export async function isActiveMember(supabase: SupabaseClient, req: Request) {
  const token = String(req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return false
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('activate')
    .eq('id', data.user.id)
    .maybeSingle()
  return profile?.activate === true
}
