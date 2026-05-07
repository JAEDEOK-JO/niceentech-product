import { createClient } from 'npm:@supabase/supabase-js'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Content-Type': 'application/json',
}

const allowedRoles = new Set(['admin', '관리자', '작업반장', '일반', '외주'])
const allowedWorkMans = new Set([
  '없음',
  '관리자',
  '작업반장',
  '전체',
  '마킹1',
  '마킹2',
  '레이저1',
  '레이저2',
  '무용접',
  '무용접반',
  '나사',
  '티&면치',
  '메인',
  '용접',
  '용접반',
  '진민택',
  '민뚜라',
])

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

const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase()
const normalizeText = (value: unknown) => String(value ?? '').trim()

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

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
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

  if (String(callerProfile?.role ?? '').trim() !== 'admin') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: jsonHeaders })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: jsonHeaders })
  }

  const email = normalizeEmail(body.email)
  const password = String(body.password ?? '')
  const name = normalizeText(body.name)
  const department = normalizeText(body.department)
  const position = normalizeText(body.position)
  const phone = normalizeText(body.phone)
  const role = normalizeText(body.role) || '일반'
  const workMan = normalizeText(body.work_man) || '없음'
  const activate = body.activate !== false

  if (!email || password.length < 6 || !name || !allowedRoles.has(role) || !allowedWorkMans.has(workMan)) {
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
    department,
    position,
    role,
    work_man: workMan,
    activate,
    phone,
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
