import { supabase } from '@/lib/supabase'
import { normalizeProductionWorkType } from '@/utils/productionStatus'
import {
  finishDrawingQualityStatus,
  startDrawingQualityStatus,
} from '@/features/main/drawing-quality/drawingQualityStatus'
import { watchDrawingQuantityState } from '@/features/main/drawing-quality/drawingQualityWatch'

const watchedFileIds = new Set()
const CHUNK_SIZE = 100

function weldPlanRows(groups) {
  const rows = []
  const seen = new Set()
  for (const group of groups ?? []) {
    for (const row of group?.rows ?? []) {
      if (normalizeProductionWorkType(row?.work_type) !== '용접/무용접') continue
      const id = Number(row?.id ?? 0)
      if (!id || seen.has(id)) continue
      seen.add(id)
      rows.push({
        id,
        drawingNo: String(row?.initial ?? '').trim(),
        group: '용접/무용접',
      })
    }
  }
  return rows
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

export async function restoreDrawingQualityStatuses(groups) {
  const rows = weldPlanRows(groups)
  if (rows.length === 0) return

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
}
