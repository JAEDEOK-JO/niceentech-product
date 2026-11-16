import { createClient } from 'npm:@supabase/supabase-js'
import { answerQuestion } from './answer.ts'
import { watchChatbotRun } from './runStop.ts'
import { userIdFromToken } from './userId.ts'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Content-Type': 'application/json',
}

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders })

function readUserId(req: Request) {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  return userIdFromToken(token)
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
  const runId = /^[0-9a-f-]{36}$/i.test(String(payload.runId ?? '')) ? String(payload.runId) : ''
  if (!question || question.length > 500) return jsonResponse({ ok: false, message: '질문을 확인해 주세요' }, 400)

  const userId = readUserId(req)
  if (!userId) return jsonResponse({ ok: false, message: '로그인이 필요합니다' }, 401)

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const stop = new AbortController()
  const abort = () => stop.abort()
  req.signal.addEventListener('abort', abort)
  const stopWatch = watchChatbotRun(supabase, runId, stop)
  const finishRun = () => {
    stopWatch()
    if (!runId) return
    supabase.from('chatbot_runs').delete().eq('id', runId).then(() => {})
  }
  const stream = (req.headers.get('Accept') ?? '').includes('text/event-stream')

  if (!stream) {
    try {
      await answerQuestion(supabase, userId, question, undefined, stop.signal)
      if (stop.signal.aborted) return new Response(null, { status: 499 })
      return jsonResponse({ ok: true })
    } catch (error) {
      if (stop.signal.aborted) return new Response(null, { status: 499 })
      console.error('chatbot failed', error)
      return jsonResponse({ ok: false, message: '답변 실패' }, 500)
    } finally {
      finishRun()
    }
  }

  const encoder = new TextEncoder()
  let closed = false
  const streamBody = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        if (closed || stop.signal.aborted) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          closed = true
        }
      }
      try {
        await answerQuestion(supabase, userId, question, (delta) => send({ type: 'reasoning', delta }), stop.signal)
        if (!stop.signal.aborted) send({ type: 'done' })
      } catch (error) {
        if (stop.signal.aborted) return
        console.error('chatbot failed', error)
        send({ type: 'error', message: '답변 실패' })
      } finally {
        finishRun()
        if (!closed) controller.close()
      }
    },
    cancel() {
      closed = true
      stop.abort()
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
