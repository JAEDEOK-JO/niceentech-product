import type { QualityListRow } from '../types/quality'

const COUNT_FIELDS = ['a32', 'a40', 'a50', 'a65', 'm65', 'm80', 'm100', 'm125', 'm150', 'm200'] as const

type LotEndSource = Pick<QualityListRow, 'lotNumStartH' | 'lotNumEndH' | (typeof COUNT_FIELDS)[number]>

export function calculatedLotEnd(row: LotEndSource): number {
  const start = Number(row.lotNumStartH) || 0
  const total = COUNT_FIELDS.reduce((sum, key) => sum + Number(row[key] ?? 0), 0)
  if (start <= 0) return total > 0 ? total - 1 : 0
  return total > 0 ? start + total - 1 : start
}

export function isEditedLotEnd(row: LotEndSource): boolean {
  const end = Number(row.lotNumEndH) || 0
  if (end <= 0) return false
  return end !== calculatedLotEnd(row)
}
