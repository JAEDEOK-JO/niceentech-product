import { supabase } from '@/lib/supabase'
import { countsDrawingQuantity, quantityWorkType } from '@/features/main/drawing-quality/quantityWorkTypes'
import {
  drawingQualityStatuses,
  finishDrawingQualityStatus,
  showFinishedDrawingQualityStatus,
  startDrawingQualityStatus,
} from '@/features/main/drawing-quality/drawingQualityStatus'
import { watchDrawingQuantityState } from '@/features/main/drawing-quality/drawingQualityWatch'

const watchedFileIds = new Set()
const CHUNK_SIZE = 100
const FINISHED_STATES = ['done', 'review', 'failed']
let settleTimer = null
let settleProductIds = []

function quantityPlanRows(groups) {
  const rows = []
  const seen = new Set()
  for (const group of groups ?? []) {
    for (const row of group?.rows ?? []) {
      if (!countsDrawingQuantity(row?.work_type)) continue
      const id = Number(row?.id ?? 0)
      if (!id || seen.has(id)) continue
      seen.add(id)
      rows.push({
        id,
        drawingNo: String(row?.initial ?? '').trim(),
        group: quantityWorkType(row?.work_type),
      })
    }
  }
  return rows
}

async function latestFinishedRun(productListIds) {
  let latest = null
  for (let index = 0; index < productListIds.length; index += CHUNK_SIZE) {
    const chunk = productListIds.slice(index, index + CHUNK_SIZE)
    const { data, error } = await supabase
      .from('drawing_quantity_runs')
      .select('product_list_id, state, finished_at')
      .in('product_list_id', chunk)
      .in('state', FINISHED_STATES)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(1)
    if (error) continue
    const row = data?.[0]
    if (!row?.finished_at) continue
    if (!latest || String(row.finished_at) > String(latest.finished_at)) latest = row
  }
  return latest
}

async function runningDrawingFiles(productListIds) {
  const files = []
  for (let index = 0; index < productListIds.length; index += CHUNK_SIZE) {
    const chunk = productListIds.slice(index, index + CHUNK_SIZE)
    const { data, error } = await supabase
      .from('drawing_pdf')
      .select('id, product_list_id')
      .in('product_list_id', chunk)
      .eq('quantity_state', 'running')
    if (error) return files
    files.push(...(data ?? []))
  }
  return files
}

async function settleRunningStatuses() {
  const runningItems = drawingQualityStatuses.filter((item) => item.state === 'running')
  if (runningItems.length === 0) return
  const ids = [...new Set(runningItems.map((item) => item.productListId))]
  const { data, error } = await supabase
    .from('drawing_pdf')
    .select('product_list_id, quantity_state')
    .in('product_list_id', ids)
  if (error) return

  const byProduct = new Map()
  for (const row of data ?? []) {
    const id = Number(row.product_list_id)
    const states = byProduct.get(id) ?? []
    states.push(row.quantity_state)
    byProduct.set(id, states)
  }

  for (const item of runningItems) {
    const states = byProduct.get(item.productListId) ?? []
    if (states.length === 0 || states.some((state) => state === 'running' || state == null)) continue
    const state = states.includes('failed') ? 'failed' : states.includes('review') ? 'review' : 'done'
    finishDrawingQualityStatus(item.id, state)
  }
}

function watchSettledStatuses(productIds) {
  settleProductIds = productIds
  if (settleTimer) return
  settleTimer = window.setInterval(() => {
    if (settleProductIds.length === 0) return
    void settleRunningStatuses()
  }, 2000)
}

export async function restoreDrawingQualityStatuses(groups) {
  const rows = quantityPlanRows(groups)
  if (rows.length === 0) return
  watchSettledStatuses(rows.map((row) => row.id))

  const files = await runningDrawingFiles(rows.map((row) => row.id))
  const plans = new Map(rows.map((row) => [row.id, row]))

  for (const file of files) {
    const fileId = Number(file.id)
    if (!fileId || watchedFileIds.has(fileId)) continue
    const plan = plans.get(Number(file.product_list_id))
    if (!plan) continue

    watchedFileIds.add(fileId)
    const statusId = startDrawingQualityStatus({
      productListId: plan.id,
      drawingNo: plan.drawingNo,
      group: plan.group,
    })
    void watchDrawingQuantityState(fileId).then((state) => {
      if (state === 'done' || state === 'review') finishDrawingQualityStatus(statusId, state)
      else if (state !== 'running') finishDrawingQualityStatus(statusId, 'failed')
    })
  }

  await settleRunningStatuses()

  const latest = await latestFinishedRun(rows.map((row) => row.id))
  if (!latest) return
  const plan = plans.get(Number(latest.product_list_id))
  if (!plan || !FINISHED_STATES.includes(latest.state)) return
  showFinishedDrawingQualityStatus({
    productListId: plan.id,
    drawingNo: plan.drawingNo,
    group: plan.group,
    state: latest.state,
  })
}
