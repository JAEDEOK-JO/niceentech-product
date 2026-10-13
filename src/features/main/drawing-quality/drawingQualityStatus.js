import { reactive } from 'vue'

export const drawingQualityStatuses = reactive([])

export function startDrawingQualityStatus({ productListId, drawingNo, group }) {
  const existing = drawingQualityStatuses.find((item) => item.productListId === productListId)
  if (existing) {
    existing.drawingNo = drawingNo
    existing.group = group
    existing.state = 'running'
    existing.restored = false
    return existing.id
  }

  const id = `${productListId}-${Date.now()}`
  drawingQualityStatuses.push({
    id,
    productListId,
    drawingNo,
    group,
    state: 'running',
  })
  return id
}

export function finishDrawingQualityStatus(id, state) {
  const item = drawingQualityStatuses.find((entry) => entry.id === id)
  if (!item) return
  item.state = state
  item.restored = false
  for (let index = drawingQualityStatuses.length - 1; index >= 0; index -= 1) {
    const entry = drawingQualityStatuses[index]
    if (entry.id !== id && entry.state !== 'running') drawingQualityStatuses.splice(index, 1)
  }
}

export function showFinishedDrawingQualityStatus({ productListId, drawingNo, group, state }) {
  if (drawingQualityStatuses.some((item) => !item.restored && item.state !== 'running')) return
  for (let index = drawingQualityStatuses.length - 1; index >= 0; index -= 1) {
    const item = drawingQualityStatuses[index]
    if (item.restored && item.state !== 'running') drawingQualityStatuses.splice(index, 1)
  }
  if (drawingQualityStatuses.some((item) => item.productListId === productListId)) return
  drawingQualityStatuses.push({
    id: `finished-${productListId}`,
    productListId,
    drawingNo,
    group,
    state,
    restored: true,
  })
}

export function removeDrawingQualityStatus(id) {
  const index = drawingQualityStatuses.findIndex((entry) => entry.id === id)
  if (index >= 0) drawingQualityStatuses.splice(index, 1)
}
