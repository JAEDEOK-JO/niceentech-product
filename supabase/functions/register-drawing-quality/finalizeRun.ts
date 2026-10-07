import type { SupabaseClient } from 'npm:@supabase/supabase-js'
import { sumIncludedRecords } from './aggregateRecords.ts'
import { insertQualityList } from './insertQualityList.ts'
import { quantitiesFromDiameterCounts } from './quantityFields.ts'
import { updateRun, type QuantityRun } from './runStore.ts'

export function failureMessage(detail: string) {
  if (detail === 'company_missing') return '회사 연결 실패'
  if (detail === 'test_date_missing') return '검수일이 없습니다'
  if (detail === 'openai_key_missing') return 'API 키 없음'
  if (detail.startsWith('openai_')) return '도면 수량 읽기 실패'
  return detail.slice(0, 80) || '검수리스트 등록 실패'
}

export async function setDrawingQuantityState(
  supabase: SupabaseClient,
  drawingPdfId: number | null,
  state: string | null,
  message: string | null = null,
) {
  if (!drawingPdfId) return
  await supabase
    .from('drawing_pdf')
    .update({ quantity_state: state, quantity_message: message })
    .eq('id', drawingPdfId)
}

async function insertForPlan(supabase: SupabaseClient, run: QuantityRun, counts: Record<string, number>) {
  const plan = await supabase
    .from('product_list')
    .select('id, company, place, area, initial, test_date, company_info')
    .eq('id', run.product_list_id)
    .maybeSingle()
  if (plan.error || !plan.data) throw new Error('plan_missing')

  return await insertQualityList(
    supabase,
    {
      company: String(plan.data.company ?? '').trim(),
      place: String(plan.data.place ?? ''),
      area: String(plan.data.area ?? ''),
      initial: String(plan.data.initial ?? ''),
      testDate: String(plan.data.test_date ?? '').trim(),
      companyId: plan.data.company_info == null ? null : Number(plan.data.company_info),
    },
    quantitiesFromDiameterCounts(counts),
  )
}

export async function finalizeRun(supabase: SupabaseClient, run: QuantityRun) {
  const { counts, total } = sumIncludedRecords(run.records)
  const uncertainCount = run.records.filter((record) => record.status === 'uncertain').length
  const failedPages = run.pages.filter((page) => page.state === 'failed' || page.state === 'pending')
  const partialPages = run.pages.filter((page) => page.state === 'read' && !page.fully_read)
  const processedPages = run.pages.filter((page) => page.state === 'read' || page.state === 'excluded')

  let state: 'done' | 'review' | 'failed' = 'done'
  if (processedPages.length === 0) state = 'failed'
  else if (failedPages.length > 0 || partialPages.length > 0 || uncertainCount > 0) state = 'review'

  let qualityListId: number | null = null
  let error: string | null = null
  if (state !== 'failed' && run.insert_quality && run.product_list_id) {
    try {
      qualityListId = await insertForPlan(supabase, run, counts)
    } catch (insertError) {
      error = insertError instanceof Error ? insertError.message : 'insert_failed'
      state = 'failed'
    }
  }

  const finishedAt = new Date().toISOString()
  await updateRun(supabase, run.id, {
    state,
    counts,
    confirmed_total: total,
    uncertain_count: uncertainCount,
    quality_list_id: qualityListId,
    error: error ?? run.error,
    pages: run.pages,
    records: run.records,
    finished_at: finishedAt,
  })

  const message = state === 'failed' ? failureMessage(error ?? 'openai_failed') : null
  await setDrawingQuantityState(supabase, run.drawing_pdf_id, state, message)
  return state
}
