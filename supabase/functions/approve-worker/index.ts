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

function readCallerId(token: string) {
  const part = token.split('.')[1] ?? ''
  if (!part) return ''
  try {
    const claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='))) as {
      sub?: unknown
      role?: unknown
      exp?: unknown
    }
    if (claims.role !== 'authenticated') return ''
    const exp = Number(claims.exp)
    if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return ''
    const id = String(claims.sub ?? '')
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : ''
  } catch {
    return ''
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: jsonHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const { config, missing } = getRuntimeConfig()
  if (missing.length > 0) return json({ error: 'missing_config', missing }, 500)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'forbidden' }, 403)

  const callerId = readCallerId(token)
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
