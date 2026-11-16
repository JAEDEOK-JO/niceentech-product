import { createClient } from 'npm:@supabase/supabase-js'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Content-Type': 'application/json',
}

const WORKER_DEPARTMENTS = ['용접부', '나사부', '생산부', 'CNC']

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

const normalizeId = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/@niceentech\.kr$/i, '')
    .replace(/[^a-z0-9._-]/g, '')

const WORKER_ROLE = '작업자'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: jsonHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: jsonHeaders })
  }

  const { config, missing } = getRuntimeConfig()
  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: 'missing_config', missing }), { status: 500, headers: jsonHeaders })
  }

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ departments: WORKER_DEPARTMENTS }), { headers: jsonHeaders })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: jsonHeaders })
  }

  const emailId = normalizeId(body.emailId ?? body.id ?? body.email)
  const password = String(body.password ?? '')
  const name = String(body.name ?? '').trim()
  const assignedDepartment = String(body.assignedDepartment ?? '').trim()
  const email = `${emailId}@niceentech.kr`

  if (!emailId || password.length < 6 || !name || !WORKER_DEPARTMENTS.includes(assignedDepartment)) {
    return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: jsonHeaders })
  }
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError || !created?.user?.id) {
    const message = String(createError?.message ?? '')
    const error = message.toLowerCase().includes('already') ? 'duplicate_email' : 'create_user_failed'
    return new Response(JSON.stringify({ error, message }), { status: 400, headers: jsonHeaders })
  }

  const userId = created.user.id
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    name,
    department: assignedDepartment,
    assigned_department: assignedDepartment,
    role: WORKER_ROLE,
    work_man: '없음',
    activate: false,
    email,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId)
    return new Response(JSON.stringify({ error: 'profile_insert_failed', message: profileError.message }), {
      status: 500,
      headers: jsonHeaders,
    })
  }

  return new Response(JSON.stringify({ ok: true, id: userId }), { headers: jsonHeaders })
})
