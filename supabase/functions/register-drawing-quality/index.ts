import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js'
import { advanceRun } from './advanceRun.ts'
import { isSignedInUser, isWebhook } from './requestAuth.ts'
import { listDueRunIds } from './runStore.ts'
import { CHECK_DELAY_MS, startDrawingRun, startEvaluationRun } from './startRun.ts'

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void
}

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey, x-drawing-quality-secret',
  'Content-Type': 'application/json',
}

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders })

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function advanceDueRuns(supabase: SupabaseClient) {
  const runIds = await listDueRunIds(supabase)
  for (const runId of runIds) await advanceRun(supabase, runId)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 500)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const webhook = await isWebhook(supabase, req)
  const action = String(body.action ?? 'start')

  try {
    if (action === 'tick') {
      if (!webhook) return jsonResponse({ ok: false }, 401)
      EdgeRuntime.waitUntil(advanceDueRuns(supabase))
      return jsonResponse({ ok: true })
    }

    if (action === 'evaluate') {
      if (!webhook) return jsonResponse({ ok: false }, 401)
      const sourcePath = String(body.sourcePath ?? '').trim()
      if (!sourcePath) return jsonResponse({ ok: false }, 400)
      const runId = await startEvaluationRun(supabase, sourcePath, String(body.fileName ?? 'drawing.pdf'))
      EdgeRuntime.waitUntil(advanceRun(supabase, runId))
      return jsonResponse({ ok: true, runId })
    }

    if (!webhook && !(await isSignedInUser(supabase, req))) {
      return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 401)
    }

    const productListId = Number(body.productListId ?? 0)
    const drawingFileId = Number(body.drawingFileId ?? 0)
    if (!productListId || !drawingFileId) return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 400)

    const started = await startDrawingRun(supabase, productListId, drawingFileId)
    if (started.status === 'missing') return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 404)
    if (started.status === 'skipped') return jsonResponse({ ok: true, skipped: true })
    if (started.status === 'started') {
      EdgeRuntime.waitUntil(delay(CHECK_DELAY_MS + 500).then(() => advanceRun(supabase, started.runId)))
    }
    return jsonResponse({ ok: true, accepted: true })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown'
    console.error('register-drawing-quality', detail)
    return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 500)
  }
})
