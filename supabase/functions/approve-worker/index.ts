import { createClient } from 'npm:@supabase/supabase-js'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Content-Type': 'application/json',
}

const adminRoles = new Set(['super_admin', 'admin', '관리자'])

const getRuntimeConfig = () => {
  const config = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  }
  const missing = Object.entries(config)
    .filter(([, value]) => !String(value).trim())
    .map(([key]) => key)
  return { config, missing }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: jsonHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: jsonHeaders })
  }

  const { config, missing } = getRuntimeConfig()
  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: 'missing_config', missing }), { status: 500, headers: jsonHeaders })
  }

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: jsonHeaders })
  }

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
  const { data: callerData, error: callerError } = await supabase.auth.getUser(token)
  const callerId = callerData?.user?.id
  if (callerError || !callerId) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: jsonHeaders })
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .maybeSingle()

  if (!adminRoles.has(String(callerProfile?.role ?? '').trim())) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: jsonHeaders })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: jsonHeaders })
  }

  const id = String(body.id ?? '').trim()
  if (!id) {
    return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: jsonHeaders })
  }

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ activate: true })
    .eq('id', id)
    .eq('role', '작업자')
    .eq('activate', false)
    .select('id')
    .maybeSingle()

  if (updateError) {
    return new Response(JSON.stringify({ error: 'approve_failed', message: updateError.message }), {
      status: 500,
      headers: jsonHeaders,
    })
  }
  if (!updated?.id) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: jsonHeaders })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders })
})
