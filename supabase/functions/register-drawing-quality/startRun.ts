import type { SupabaseClient } from 'npm:@supabase/supabase-js'
import { QUANTITY_MODEL, QUANTITY_REASONING_EFFORT } from './openaiResponses.ts'
import { createRun } from './runStore.ts'

export const CHECK_DELAY_MS = 10_000

export async function startDrawingRun(supabase: SupabaseClient, productListId: number, drawingFileId: number) {
  const drawing = await supabase
    .from('drawing_pdf')
    .select('id, name, nas_path, product_list_id')
    .eq('id', drawingFileId)
    .eq('product_list_id', productListId)
    .maybeSingle()

  if (drawing.error || !drawing.data) return { status: 'missing' as const }

  const fileName = String(drawing.data.name ?? '')
  const sourcePath = String(drawing.data.nas_path ?? '').trim()
  if (!fileName.toLowerCase().endsWith('.pdf')) return { status: 'skipped' as const }
  if (!sourcePath) return { status: 'missing' as const }

  const plan = await supabase
    .from('product_list')
    .select('work_type, test_date, initial, company, place, area')
    .eq('id', productListId)
    .maybeSingle()
  if (plan.error) throw new Error(plan.error.message)
  const workType = String(plan.data?.work_type ?? '').replaceAll(' ', '').trim()
  if (workType !== '용접/무용접' && workType !== '전실/입상' && workType !== '전실입상' && workType !== '입상/전실' && workType !== '입상전실') {
    return { status: 'skipped' as const }
  }

  const claimed = await supabase
    .from('drawing_pdf')
    .update({ quantity_state: 'running', quantity_message: null })
    .eq('id', drawingFileId)
    .is('quantity_state', null)
    .select('id')
  if (claimed.error) throw new Error(claimed.error.message)
  if (!claimed.data?.length) return { status: 'already' as const }

  const runId = await createRun(supabase, {
    drawingPdfId: drawingFileId,
    productListId,
    sourcePath,
    fileName,
    insertQuality: true,
    startAfter: new Date(Date.now() + CHECK_DELAY_MS),
    model: QUANTITY_MODEL,
    effort: QUANTITY_REASONING_EFFORT,
    testDate: String(plan.data?.test_date ?? '').trim(),
    drawingNo: String(plan.data?.initial ?? '').trim(),
    company: String(plan.data?.company ?? '').trim(),
    place: String(plan.data?.place ?? '').trim(),
    area: String(plan.data?.area ?? '').trim(),
  })
  return { status: 'started' as const, runId }
}

export async function startEvaluationRun(supabase: SupabaseClient, sourcePath: string, fileName: string) {
  return await createRun(supabase, {
    drawingPdfId: null,
    productListId: null,
    sourcePath,
    fileName,
    insertQuality: false,
    startAfter: new Date(),
    model: QUANTITY_MODEL,
    effort: QUANTITY_REASONING_EFFORT,
  })
}
