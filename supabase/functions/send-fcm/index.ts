import { createClient } from 'npm:@supabase/supabase-js'
import { importPKCS8, SignJWT } from 'npm:jose@5'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey, x-fcm-webhook-secret',
  'Content-Type': 'application/json',
}

type ServiceAccount = {
  project_id: string
  client_email: string
  private_key: string
}

const normalizeText = (value: unknown) => String(value ?? '').trim()

const getRuntimeConfig = () => {
  const config = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    FIREBASE_SERVICE_ACCOUNT_JSON: Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON') ?? '',
    FCM_WEBHOOK_SECRET: Deno.env.get('FCM_WEBHOOK_SECRET') ?? '',
    SITE_URL: Deno.env.get('SITE_URL') ?? '',
  }
  const missing = Object.entries(config)
    .filter(([, value]) => !String(value).trim())
    .map(([key]) => key)

  return { config, missing }
}

const parseServiceAccount = (raw: string): ServiceAccount => {
  const parsed = JSON.parse(raw) as ServiceAccount
  if (!parsed?.project_id || !parsed?.client_email || !parsed?.private_key) {
    throw new Error('invalid_service_account')
  }
  return parsed
}

const getGoogleAccessToken = async (serviceAccount: ServiceAccount) => {
  const privateKey = await importPKCS8(serviceAccount.private_key.replace(/\\n/g, '\n'), 'RS256')
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    throw new Error(`google_token_failed:${response.status}`)
  }

  const payload = await response.json()
  return String(payload?.access_token ?? '')
}

const sendFcmMessage = async (
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  url: string,
  siteUrl: string,
) => {
  const link = url.startsWith('http') ? url : siteUrl ? `${siteUrl.replace(/\/$/, '')}${url}` : undefined
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { url, title, body },
        webpush: {
          fcm_options: { link },
          notification: {
            title,
            body,
            icon: '/icon-192.svg',
          },
        },
      },
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = String(payload?.error?.message ?? response.statusText)
    const code = String(payload?.error?.details?.[0]?.errorCode ?? payload?.error?.status ?? '')
    return { ok: false, code, message }
  }

  return { ok: true, code: '', message: '' }
}

const isAuthorized = (req: Request, webhookSecret: string) => {
  const headerSecret = normalizeText(req.headers.get('x-fcm-webhook-secret'))
  if (headerSecret && headerSecret === webhookSecret) return true

  const authHeader = normalizeText(req.headers.get('authorization'))
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (authHeader === `Bearer ${serviceRole}`) return true

  return false
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

  if (!isAuthorized(req, config.FCM_WEBHOOK_SECRET)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: jsonHeaders })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: jsonHeaders })
  }

  const recipientUserId = normalizeText(body.recipientUserId)
  const title = normalizeText(body.title) || '알림'
  const messageBody = normalizeText(body.body)
  const url = normalizeText(body.url) || '/attendance'

  if (!recipientUserId) {
    return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: jsonHeaders })
  }

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
  const { data: tokens, error: tokenError } = await supabase
    .from('fcm_tokens')
    .select('id,token')
    .eq('user_id', recipientUserId)

  if (tokenError) {
    return new Response(JSON.stringify({ error: 'token_lookup_failed', message: tokenError.message }), {
      status: 500,
      headers: jsonHeaders,
    })
  }

  if (!tokens?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 'no_tokens' }), { headers: jsonHeaders })
  }

  const serviceAccount = parseServiceAccount(config.FIREBASE_SERVICE_ACCOUNT_JSON)
  const accessToken = await getGoogleAccessToken(serviceAccount)

  let sent = 0
  const staleTokenIds: string[] = []

  for (const row of tokens) {
    const token = normalizeText(row.token)
    if (!token) continue

    const result = await sendFcmMessage(
      accessToken,
      serviceAccount.project_id,
      token,
      title,
      messageBody,
      url,
      config.SITE_URL,
    )
    if (result.ok) {
      sent += 1
      continue
    }

    if (['UNREGISTERED', 'INVALID_ARGUMENT'].includes(result.code)) {
      staleTokenIds.push(String(row.id))
    }
  }

  if (staleTokenIds.length > 0) {
    await supabase.from('fcm_tokens').delete().in('id', staleTokenIds)
  }

  return new Response(JSON.stringify({ ok: true, sent, staleRemoved: staleTokenIds.length }), { headers: jsonHeaders })
})
