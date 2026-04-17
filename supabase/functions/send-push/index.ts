import { createClient } from 'npm:@supabase/supabase-js'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
}

const getRuntimeConfig = () => {
  const config = {
    ONESIGNAL_APP_ID: Deno.env.get('ONESIGNAL_APP_ID') ?? '',
    ONESIGNAL_REST_API_KEY: Deno.env.get('ONESIGNAL_REST_API_KEY') ?? '',
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    SITE_URL: Deno.env.get('SITE_URL') ?? '',
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

  const { config, missing } = getRuntimeConfig()
  if (missing.length > 0) {
    console.error('send-push config missing:', missing.join(', '))
    return new Response(JSON.stringify({ error: 'missing_config', missing }), {
      status: 500,
      headers: jsonHeaders,
    })
  }

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)

  let requestBody: { user_ids?: string[]; exclude_user_id?: string; title?: string; body?: string; url?: string }
  try {
    requestBody = await req.json()
  } catch (error) {
    console.error('send-push invalid json:', error)
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  const { user_ids, exclude_user_id, title, body, url = '/' } = requestBody
  const excludedUserId = String(exclude_user_id ?? '').trim()

  if (!title) {
    return new Response(JSON.stringify({ error: 'invalid_input' }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  // 대상 user ID 목록 결정
  let targetUserIds: string[]

  if (Array.isArray(user_ids) && user_ids.length > 0) {
    targetUserIds = user_ids.map((v) => String(v ?? '').trim()).filter(Boolean)
  } else {
    // profiles 테이블에서 전체 유저 조회 후 발신자 제외
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')

    if (profilesError) {
      console.error('send-push profiles query failed:', profilesError)
      return new Response(JSON.stringify({ error: 'profiles_query_failed' }), {
        status: 500,
        headers: jsonHeaders,
      })
    }

    targetUserIds = (profiles ?? [])
      .map((p) => String(p.id ?? '').trim())
      .filter((id) => id && id !== excludedUserId)
  }

  if (targetUserIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: jsonHeaders })
  }

  // 절대 URL 구성
  const launchUrl = url.startsWith('http')
    ? url
    : `${config.SITE_URL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`

  // OneSignal REST API로 전송
  const osPayload = {
    app_id: config.ONESIGNAL_APP_ID,
    include_external_user_ids: targetUserIds,
    channel_for_external_user_ids: 'push',
    headings: { en: title, ko: title },
    contents: { en: body ?? '', ko: body ?? '' },
    url: launchUrl,
    web_url: launchUrl,
  }

  let osResponse: Response
  try {
    osResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${config.ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(osPayload),
    })
  } catch (err) {
    console.error('send-push OneSignal fetch error:', err)
    return new Response(JSON.stringify({ error: 'onesignal_fetch_failed' }), {
      status: 500,
      headers: jsonHeaders,
    })
  }

  const osResult = await osResponse.json().catch(() => ({}))

  if (!osResponse.ok) {
    console.error('send-push OneSignal error:', osResult)
    return new Response(JSON.stringify({ error: 'onesignal_error', detail: osResult }), {
      status: osResponse.status,
      headers: jsonHeaders,
    })
  }

  return new Response(
    JSON.stringify({ sent: osResult.recipients ?? targetUserIds.length, onesignal: osResult }),
    { headers: jsonHeaders },
  )
})
