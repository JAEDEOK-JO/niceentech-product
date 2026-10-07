import type { SupabaseClient } from 'npm:@supabase/supabase-js'
import { readBackgroundResponse, submitBackgroundResponse } from './openaiResponses.ts'
import { buildRegionPdf, buildUprightPdf, type PageRegion } from './pdfPages.ts'
import { buildPagePrompt, buildSurveyPrompt, buildZoomPrompt, type SharedNote } from './quantityPrompts.ts'
import { pageSchema, surveySchema, zoomSchema } from './quantitySchemas.ts'
import { updateTask, type QuantityRun, type QuantityTask } from './runStore.ts'

const MAX_ATTEMPTS = 3
const STALE_SUBMIT_MS = 30 * 60 * 1000

export type PdfSource = () => Promise<Uint8Array>

function notesForPage(notes: SharedNote[], pageNo: number) {
  return notes.filter((note) => note.applies_to_pages.length === 0 || note.applies_to_pages.includes(pageNo))
}

async function buildRequest(run: QuantityRun, task: QuantityTask, loadPdf: PdfSource) {
  const bytes = await loadPdf()
  const pageCount = run.page_count ?? 0

  if (task.kind === 'survey') {
    return {
      pdf: { fileName: 'drawing.pdf', bytes: await buildUprightPdf(bytes) },
      prompt: buildSurveyPrompt(pageCount),
      schemaName: 'drawing_page_survey',
      schema: surveySchema,
    }
  }

  const pageNo = task.pages[0]
  if (task.kind === 'page') {
    return {
      pdf: { fileName: `page-${pageNo}.pdf`, bytes: await buildUprightPdf(bytes, [pageNo]) },
      prompt: buildPagePrompt({ pageNo, pageCount, notes: notesForPage(run.shared_notes, pageNo) }),
      schemaName: 'drawing_page_records',
      schema: pageSchema,
    }
  }

  const record = task.context.record as Record<string, unknown>
  const region = record.region as PageRegion
  return {
    pdf: { fileName: `page-${pageNo}-zoom.pdf`, bytes: await buildRegionPdf(bytes, pageNo, region) },
    prompt: buildZoomPrompt({ pageNo, record, quantityNotes: String(task.context.quantityNotes ?? '') }),
    schemaName: 'drawing_zoom_records',
    schema: zoomSchema,
  }
}

async function failOrRequeue(supabase: SupabaseClient, task: QuantityTask, reason: string, attempts: number) {
  const permanent = reason === 'openai_key_missing' || reason.startsWith('page_out_of_range') || reason === 'region_too_small'
  if (permanent || attempts >= MAX_ATTEMPTS) {
    await updateTask(supabase, task.id, { state: 'failed', error: reason, finished_at: new Date().toISOString() })
    return
  }
  await updateTask(supabase, task.id, { state: 'queued', error: reason, response_id: null })
}

export async function submitQueuedTasks(
  supabase: SupabaseClient,
  run: QuantityRun,
  tasks: QuantityTask[],
  loadPdf: PdfSource,
) {
  for (const task of tasks.filter((item) => item.state === 'queued')) {
    const attempts = task.attempts + 1
    try {
      const request = await buildRequest(run, task, loadPdf)
      const responseId = await submitBackgroundResponse(request)
      await updateTask(supabase, task.id, {
        state: 'submitted',
        attempts,
        response_id: responseId,
        submitted_at: new Date().toISOString(),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'submit_failed'
      await updateTask(supabase, task.id, { attempts })
      await failOrRequeue(supabase, task, reason, attempts)
    }
  }
}

export async function pollSubmittedTasks(supabase: SupabaseClient, tasks: QuantityTask[]) {
  for (const task of tasks.filter((item) => item.state === 'submitted' && item.response_id)) {
    const submittedAt = task.submitted_at ? Date.parse(task.submitted_at) : Date.now()
    const snapshot = await readBackgroundResponse(String(task.response_id))

    if (snapshot.state === 'running') {
      if (Date.now() - submittedAt > STALE_SUBMIT_MS) await failOrRequeue(supabase, task, 'openai_stale', task.attempts)
      continue
    }

    if (snapshot.state === 'failed') {
      await updateTask(supabase, task.id, { usage: snapshot.usage })
      await failOrRequeue(supabase, task, snapshot.reason, task.attempts)
      continue
    }

    try {
      const result = JSON.parse(snapshot.text) as Record<string, unknown>
      await updateTask(supabase, task.id, {
        state: 'done',
        result,
        usage: snapshot.usage,
        error: null,
        finished_at: new Date().toISOString(),
      })
    } catch {
      await updateTask(supabase, task.id, { usage: snapshot.usage })
      await failOrRequeue(supabase, task, 'openai_parse_failed', task.attempts)
    }
  }
}
