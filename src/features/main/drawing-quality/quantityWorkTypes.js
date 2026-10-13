import { normalizeProductionWorkType } from '@/utils/productionStatus'

const QUANTITY_WORK_TYPES = new Set(['용접/무용접', '전실/입상'])

export function quantityWorkType(workType) {
  const normalized = normalizeProductionWorkType(workType)
  return QUANTITY_WORK_TYPES.has(normalized) ? normalized : ''
}

export function countsDrawingQuantity(workType) {
  return quantityWorkType(workType) !== ''
}
