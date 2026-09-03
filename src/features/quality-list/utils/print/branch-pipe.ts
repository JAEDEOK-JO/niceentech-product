import type { QualityListRow } from '../../types/quality'
import type { BranchPipeItem, BranchSize } from '../../types/print'
import { BRANCH_BUNDLES, BRANCH_SIZES } from '../../types/print'
import { chunkPages, formatPrintQty } from './format'
import { formatMainPipeLotCode, formatMainPipeLotRange } from './main-pipe'

export const BRANCH_PIPE_PAGE_SIZE = 1
export const BRANCH_BUNDLE_PAIRS = [
  [1, 2],
  [3, 4],
  [5, 6],
] as const

export function hasBranchPipeQuantity(row: QualityListRow): boolean {
  return Number(row.a32 ?? 0) + Number(row.a40 ?? 0) + Number(row.a50 ?? 0) + Number(row.a65 ?? 0) !== 0
}

export function buildBranchPipeItems(rows: QualityListRow[]): BranchPipeItem[] {
  return rows
    .map((row, index) => ({
      originalIndex: index + 1,
      row,
      lotText: formatBranchLotText(row),
    }))
    .filter((item) => hasBranchPipeQuantity(item.row))
}

export function getBundleValue(row: QualityListRow, bundle: number, size: BranchSize): number {
  const key = `${size}_0${bundle}` as keyof QualityListRow
  return Number(row[key] ?? 0) || 0
}

export function formatBundleValue(row: QualityListRow, bundle: number, size: BranchSize): string {
  return formatPrintQty(getBundleValue(row, bundle, size))
}

export function formatBranchTotal(row: QualityListRow, size: BranchSize): string {
  return formatPrintQty(Number(row[size] ?? 0))
}

export function formatBranchLotText(row: QualityListRow): string {
  const code = formatMainPipeLotCode(row)
  const range = formatMainPipeLotRange(row)
  return [code, range].filter(Boolean).join(' ')
}

export function chunkBranchPipePages(items: BranchPipeItem[]): BranchPipeItem[][] {
  return chunkPages(items, BRANCH_PIPE_PAGE_SIZE)
}

export { BRANCH_BUNDLES, BRANCH_SIZES }
