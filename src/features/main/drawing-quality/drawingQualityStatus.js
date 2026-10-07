import { reactive } from 'vue'

export const drawingQualityStatuses = reactive([])

export function startDrawingQualityStatus({ productListId, drawingNo, group }) {
  const existing = drawingQualityStatuses.find((item) => item.productListId === productListId)
  if (existing) {
    existing.drawingNo = drawingNo
    existing.group = group
    existing.state = 'running'
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
}

export function removeDrawingQualityStatus(id) {
  const index = drawingQualityStatuses.findIndex((entry) => entry.id === id)
  if (index >= 0) drawingQualityStatuses.splice(index, 1)
}
