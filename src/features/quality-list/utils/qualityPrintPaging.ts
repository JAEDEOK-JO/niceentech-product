import type { QualityListRow } from '../types/quality'

export const QUALITY_PRINT_FIRST_PAGE_SIZE = 14
export const QUALITY_PRINT_NEXT_PAGE_SIZE = 15

/** 검수리스트 인쇄 페이지 분할: 1페이지 14건, 이후 15건 */
export function chunkQualityPrintPages(items: QualityListRow[]): QualityListRow[][] {
  if (!items.length) return [[]]

  const pages: QualityListRow[][] = [items.slice(0, QUALITY_PRINT_FIRST_PAGE_SIZE)]
  for (
    let offset = QUALITY_PRINT_FIRST_PAGE_SIZE;
    offset < items.length;
    offset += QUALITY_PRINT_NEXT_PAGE_SIZE
  ) {
    pages.push(items.slice(offset, offset + QUALITY_PRINT_NEXT_PAGE_SIZE))
  }
  return pages
}

export function getQualityPrintRowNumber(pageIndex: number, rowIndex: number): number {
  if (pageIndex <= 0) return rowIndex + 1
  return QUALITY_PRINT_FIRST_PAGE_SIZE + (pageIndex - 1) * QUALITY_PRINT_NEXT_PAGE_SIZE + rowIndex + 1
}
