import { createClient } from 'npm:@supabase/supabase-js'
import { answerQuestion } from './answer.ts'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Content-Type': 'application/json',
}

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders })

async function readUserId(req: Request, supabaseUrl: string, anonKey: string) {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return ''

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user?.id) return ''
  return data.user.id
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, message: '답변 실패' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return jsonResponse({ ok: false, message: '답변 실패' }, 500)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ ok: false, message: '질문을 확인해 주세요' }, 400)
  }

  const question = String(payload.question ?? '').trim()
  if (!question || question.length > 500) return jsonResponse({ ok: false, message: '질문을 확인해 주세요' }, 400)

  const userId = await readUserId(req, supabaseUrl, anonKey)
  if (!userId) return jsonResponse({ ok: false, message: '로그인이 필요합니다' }, 401)

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const stream = (req.headers.get('Accept') ?? '').includes('text/event-stream')

  if (!stream) {
    try {
      await answerQuestion(supabase, userId, question)
      return jsonResponse({ ok: true })
    } catch (error) {
      console.error('chatbot failed', error)
      return jsonResponse({ ok: false, message: '답변 실패' }, 500)
    }
  }

  const encoder = new TextEncoder()
  let closed = false
  const streamBody = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          closed = true
        }
      }
      try {
        await answerQuestion(supabase, userId, question, (delta) => send({ type: 'reasoning', delta }))
        send({ type: 'done' })
      } catch (error) {
        console.error('chatbot failed', error)
        send({ type: 'error', message: '답변 실패' })
      } finally {
        if (!closed) controller.close()
      }
    },
    cancel() {
      closed = true
    },
  })

  return new Response(streamBody, {
    headers: {
      ...jsonHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
})
