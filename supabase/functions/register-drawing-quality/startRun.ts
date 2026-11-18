import type { SupabaseClient } from 'npm:@supabase/supabase-js'
import { QUANTITY_MODEL, QUANTITY_REASONING_EFFORT } from './openaiResponses.ts'
import { hasQualityList } from './qualityListMatch.ts'
import { createRun } from './runStore.ts'

const HELD_MESSAGE = '검수리스트에 있음'

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

  if (await hasQualityList(supabase, plan.data ?? {})) {
    return await holdExistingQuality(supabase, {
      drawingFileId,
      productListId,
      sourcePath,
      fileName,
      testDate: String(plan.data?.test_date ?? '').trim(),
      drawingNo: String(plan.data?.initial ?? '').trim(),
      company: String(plan.data?.company ?? '').trim(),
      place: String(plan.data?.place ?? '').trim(),
      area: String(plan.data?.area ?? '').trim(),
    })
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

async function holdExistingQuality(
  supabase: SupabaseClient,
  values: {
    drawingFileId: number
    productListId: number
    sourcePath: string
    fileName: string
    testDate: string
    drawingNo: string
    company: string
    place: string
    area: string
  },
) {
  const now = new Date()
  try {
    await createRun(supabase, {
      drawingPdfId: values.drawingFileId,
      productListId: values.productListId,
      sourcePath: values.sourcePath,
      fileName: values.fileName,
      insertQuality: false,
      startAfter: now,
      model: QUANTITY_MODEL,
      effort: QUANTITY_REASONING_EFFORT,
      testDate: values.testDate,
      drawingNo: values.drawingNo,
      company: values.company,
      place: values.place,
      area: values.area,
      state: 'held',
      resultMessage: HELD_MESSAGE,
      finishedAt: now,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!message.includes('duplicate') && !message.includes('23505')) throw error
  }

  const marked = await supabase
    .from('drawing_pdf')
    .update({ quantity_state: 'held', quantity_message: HELD_MESSAGE })
    .eq('id', values.drawingFileId)
    .or('quantity_state.is.null,quantity_state.eq.held')
    .select('id')
  if (marked.error) throw new Error(marked.error.message)
  if (!marked.data?.length) return { status: 'already' as const }
  return { status: 'held' as const }
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
