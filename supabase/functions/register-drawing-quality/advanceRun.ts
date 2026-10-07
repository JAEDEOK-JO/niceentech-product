import type { SupabaseClient } from 'npm:@supabase/supabase-js'
import { finalizeRun, setDrawingQuantityState } from './finalizeRun.ts'
import { countPdfPages } from './pdfPages.ts'
import { applySurvey, collectPageResults, initialPages, mergeZoomResults, zoomCandidates } from './runStages.ts'
import {
  createTasks,
  listTasks,
  lockRun,
  unlockRun,
  updateRun,
  type QuantityRun,
  type QuantityTask,
  type TaskKind,
} from './runStore.ts'
import { pollSubmittedTasks, submitQueuedTasks } from './taskRunner.ts'

const RUN_TIMEOUT_MS = 45 * 60 * 1000
const MAX_STEPS = 5

const isFinished = (task: QuantityTask) => task.state === 'done' || task.state === 'failed'

function pdfLoader(supabase: SupabaseClient, path: string) {
  let cached: Uint8Array | null = null
  return async () => {
    if (cached) return cached
    const file = await supabase.storage.from('media').download(path)
    if (file.error || !file.data) throw new Error('drawing_missing')
    cached = new Uint8Array(await file.data.arrayBuffer())
    return cached
  }
}

async function failRun(supabase: SupabaseClient, run: QuantityRun, reason: string) {
  await updateRun(supabase, run.id, { state: 'failed', error: reason, finished_at: new Date().toISOString() })
  await setDrawingQuantityState(supabase, run.drawing_pdf_id, 'failed', '도면 수량 읽기 실패')
}

async function step(supabase: SupabaseClient, run: QuantityRun, loadPdf: () => Promise<Uint8Array>) {
  if (run.state === 'pending') {
    const pageCount = await countPdfPages(await loadPdf())
    if (pageCount < 1) {
      await failRun(supabase, run, 'pdf_empty')
      return null
    }
    const nextState = pageCount === 1 ? 'reading' : 'surveying'
    await createTasks(supabase, run.id, pageCount === 1 ? [{ kind: 'page', pages: [1] }] : [{ kind: 'survey', pages: [] }])
    await updateRun(supabase, run.id, { state: nextState, page_count: pageCount, pages: initialPages(pageCount) })
    return { ...run, state: nextState, page_count: pageCount, pages: initialPages(pageCount) } as QuantityRun
  }

  let tasks = await listTasks(supabase, run.id)
  await pollSubmittedTasks(supabase, tasks)
  tasks = await listTasks(supabase, run.id)
  await submitQueuedTasks(supabase, run, tasks, loadPdf)
  tasks = await listTasks(supabase, run.id)

  const byKind = (kind: TaskKind) => tasks.filter((task) => task.kind === kind)
  const timedOut = Date.now() - Date.parse(run.created_at) > RUN_TIMEOUT_MS

  if (run.state === 'surveying') {
    const survey = byKind('survey')[0]
    if (survey && !isFinished(survey) && !timedOut) return null

    const { pages, notes, pagesToRead } = applySurvey(run, survey)
    const surveyError = survey?.state === 'done' ? null : 'survey_failed'
    await createTasks(supabase, run.id, pagesToRead.map((pageNo) => ({ kind: 'page' as const, pages: [pageNo] })))
    await updateRun(supabase, run.id, { state: 'reading', pages, shared_notes: notes, error: surveyError })
    return { ...run, state: 'reading', pages, shared_notes: notes, error: surveyError } as QuantityRun
  }

  if (run.state === 'reading') {
    const pageTasks = byKind('page')
    if (pageTasks.some((task) => !isFinished(task)) && !timedOut) return null

    const { pages, records } = collectPageResults(run, pageTasks)
    const next = { ...run, pages, records } as QuantityRun
    const zooms = timedOut ? [] : zoomCandidates(next)
    if (zooms.length > 0) {
      await createTasks(supabase, run.id, zooms)
      await updateRun(supabase, run.id, { state: 'zooming', pages, records })
      return { ...next, state: 'zooming' } as QuantityRun
    }
    await finalizeRun(supabase, next)
    return null
  }

  if (run.state === 'zooming') {
    const zoomTasks = byKind('zoom')
    if (zoomTasks.some((task) => !isFinished(task)) && !timedOut) return null

    const records = mergeZoomResults(run, zoomTasks)
    await finalizeRun(supabase, { ...run, records })
    return null
  }

  return null
}

export async function advanceRun(supabase: SupabaseClient, runId: number) {
  const locked = await lockRun(supabase, runId)
  if (!locked) return

  const loadPdf = pdfLoader(supabase, locked.source_path)
  let run: QuantityRun | null = locked
  try {
    for (let index = 0; run && index < MAX_STEPS; index += 1) {
      run = await step(supabase, run, loadPdf)
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'advance_failed'
    console.error('drawing-quantity advance', runId, reason)
    if (reason === 'drawing_missing' || reason === 'openai_key_missing') await failRun(supabase, locked, reason)
  } finally {
    await unlockRun(supabase, runId)
  }
}
