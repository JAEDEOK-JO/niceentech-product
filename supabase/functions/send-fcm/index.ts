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

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders })

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
  let parsed: ServiceAccount
  try {
    parsed = JSON.parse(raw) as ServiceAccount
  } catch {
    throw new Error('invalid_service_account_json')
  }
  if (!parsed?.project_id || !parsed?.client_email || !parsed?.private_key) {
    throw new Error('invalid_service_account_fields')
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
    const detail = await response.text().catch(() => '')
    throw new Error(`google_token_failed:${response.status}:${detail.slice(0, 200)}`)
  }

  const payload = await response.json()
  const accessToken = String(payload?.access_token ?? '')
  if (!accessToken) throw new Error('google_token_empty')
  return accessToken
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
        // data-only: SW/포그라운드에서 진동·소리 옵션을 제어
        data: {
          url,
          title,
          body,
        },
        webpush: {
          headers: {
            Urgency: 'high',
            TTL: '86400',
          },
          fcm_options: { link },
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
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: jsonHeaders })
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405)
    }

    const { config, missing } = getRuntimeConfig()
    if (missing.length > 0) {
      return jsonResponse({ error: 'missing_config', missing }, 500)
    }

    if (!isAuthorized(req, config.FCM_WEBHOOK_SECRET)) {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400)
    }

    const recipientUserId = normalizeText(body.recipientUserId)
    const title = normalizeText(body.title) || '알림'
    const messageBody = normalizeText(body.body)
    const url = normalizeText(body.url) || '/attendance'

    if (!recipientUserId) {
      return jsonResponse({ error: 'invalid_input' }, 400)
    }

    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
    const { data: tokens, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('id,token')
      .eq('user_id', recipientUserId)

    if (tokenError) {
      return jsonResponse({ error: 'token_lookup_failed', message: tokenError.message }, 500)
    }

    if (!tokens?.length) {
      return jsonResponse({ ok: true, sent: 0, skipped: 'no_tokens' })
    }

    let serviceAccount: ServiceAccount
    let accessToken: string
    try {
      serviceAccount = parseServiceAccount(config.FIREBASE_SERVICE_ACCOUNT_JSON)
      accessToken = await getGoogleAccessToken(serviceAccount)
    } catch (err) {
      return jsonResponse({
        error: 'firebase_auth_failed',
        message: err instanceof Error ? err.message : String(err),
      }, 500)
    }

    let sent = 0
    const failures: Array<{ code: string; message: string }> = []
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

      failures.push({ code: result.code, message: result.message })
      if (['UNREGISTERED', 'INVALID_ARGUMENT'].includes(result.code)) {
        staleTokenIds.push(String(row.id))
      }
    }

    if (staleTokenIds.length > 0) {
      await supabase.from('fcm_tokens').delete().in('id', staleTokenIds)
    }

    return jsonResponse({
      ok: true,
      sent,
      failed: failures.length,
      staleRemoved: staleTokenIds.length,
      failures: failures.slice(0, 3),
    })
  } catch (err) {
    return jsonResponse({
      error: 'unhandled',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
