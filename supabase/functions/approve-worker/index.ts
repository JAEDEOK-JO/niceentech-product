import { createClient } from 'npm:@supabase/supabase-js'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Content-Type': 'application/json',
}

const adminRoles = new Set(['super_admin', 'admin', '관리자'])

const json = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders })

const getRuntimeConfig = () => {
  const config = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  }
  const missing = Object.entries(config)
    .filter(([, value]) => !String(value).trim())
    .map(([key]) => key)
  return { config, missing }
}

async function readCallerId(token: string, url: string, anonKey: string) {
  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user?.id) return ''
  return data.user.id
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: jsonHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const { config, missing } = getRuntimeConfig()
  if (missing.length > 0) return json({ error: 'missing_config', missing }, 500)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'forbidden' }, 403)

  const callerId = await readCallerId(token, config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  if (!callerId) return json({ error: 'forbidden' }, 403)

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .maybeSingle()
  const callerRole = String(callerProfile?.role ?? '').trim()
  if (!adminRoles.has(callerRole)) return json({ error: 'forbidden' }, 403)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const id = String(body.id ?? '').trim()
  const action = String(body.action ?? 'approve').trim()
  if (!id) return json({ error: 'invalid_input' }, 400)

  if (action === 'delete') {
    if (callerRole !== 'super_admin' || id === callerId) return json({ error: 'forbidden' }, 403)
    const { data: target } = await supabase
      .from('profiles')
      .select('id,role')
      .eq('id', id)
      .maybeSingle()
    if (String(target?.role ?? '') !== '작업자') return json({ error: 'not_found' }, 404)

    await supabase.from('worker_reward_reports').update({ reviewed_by: null }).eq('reviewed_by', id)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id)
    if (deleteError) return json({ error: 'delete_failed' }, 500)
    return json({ ok: true })
  }

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ activate: true })
    .eq('id', id)
    .eq('role', '작업자')
    .eq('activate', false)
    .select('id')
    .maybeSingle()

  if (updateError) return json({ error: 'approve_failed', message: updateError.message }, 500)
  if (!updated?.id) return json({ error: 'not_found' }, 404)
  return json({ ok: true })
})
