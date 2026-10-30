import { deriveInventoryWorkStatus } from '@/features/inventory/work-status/deriveInventoryWorkStatus'

const comparePlans = (left, right) => {
  if (left.inspectionDate !== right.inspectionDate) {
    if (!left.inspectionDate) return 1
    if (!right.inspectionDate) return -1
    return right.inspectionDate < left.inspectionDate ? -1 : 1
  }
  const siteCompare = String(left.site ?? '').localeCompare(String(right.site ?? ''), 'ko')
  if (siteCompare !== 0) return siteCompare
  return left.area.localeCompare(right.area, 'ko')
}

export const splitUncalculatedPlans = (plans) => {
  const all = []
  const started = []
  for (const row of plans ?? []) {
    if (row.calculation) continue
    const workStatus = deriveInventoryWorkStatus(row)
    const plan = workStatus ? { ...row, workStatus } : row
    all.push(plan)
    if (workStatus === '작업중' || workStatus === '작업완료') started.push(plan)
  }
  all.sort(comparePlans)
  started.sort(comparePlans)
  return { all, started }
}
