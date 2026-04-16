import webpush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
}

const getRuntimeConfig = () => {
  const config = {
    VAPID_PUBLIC_KEY: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
    VAPID_PRIVATE_KEY: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
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
    return new Response(null, {
      headers: jsonHeaders,
    })
  }

  const { config, missing } = getRuntimeConfig()
  if (missing.length > 0) {
    console.error('send-push config missing:', missing.join(', '))
    return new Response(JSON.stringify({ error: 'missing_config', missing }), {
      status: 500,
      headers: jsonHeaders,
    })
  }

  webpush.setVapidDetails('mailto:noreply@niceentech.com', config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY)
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)

  let requestBody: { user_ids?: string[]; title?: string; body?: string; url?: string }
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
  const targetUserIds = Array.isArray(user_ids)
    ? user_ids.map((value) => String(value ?? '').trim()).filter(Boolean)
    : []
  const excludedUserId = String(exclude_user_id ?? '').trim()

  if ((!targetUserIds.length && !excludedUserId) || !title) {
    return new Response(JSON.stringify({ error: 'invalid_input' }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  let subscriptionQuery = supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')

  if (targetUserIds.length > 0) {
    subscriptionQuery = subscriptionQuery.in('user_id', targetUserIds)
  } else {
    subscriptionQuery = subscriptionQuery.neq('user_id', excludedUserId)
  }

  const { data: subscriptions, error } = await subscriptionQuery

  if (error) {
    console.error('send-push subscription query failed:', error)
    return new Response(JSON.stringify({ error: 'subscription_query_failed' }), {
      status: 500,
      headers: jsonHeaders,
    })
  }

  if (!subscriptions?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200,
      headers: jsonHeaders,
    })
  }

  const payload = JSON.stringify({ title, body, url })
  const staleIds: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      } catch (err: any) {
        console.error('send-push delivery failed:', {
          subscriptionId: sub.id,
          statusCode: err?.statusCode ?? null,
          message: err?.message ?? String(err),
        })
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          staleIds.push(sub.id)
        }
      }
    }),
  )

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }

  return new Response(JSON.stringify({ sent: subscriptions.length - staleIds.length }), {
    headers: jsonHeaders,
  })
})
