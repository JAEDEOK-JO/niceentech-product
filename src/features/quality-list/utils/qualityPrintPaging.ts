import type { QualityListRow } from '../types/quality'

export const QUALITY_PRINT_PAGE_SIZE = 14

/** 검수리스트 인쇄: 매 페이지 제목+총합이 들어가므로 14건씩 분할 */
export function chunkQualityPrintPages(items: QualityListRow[]): QualityListRow[][] {
  if (!items.length) return [[]]

  const pages: QualityListRow[][] = []
  for (let offset = 0; offset < items.length; offset += QUALITY_PRINT_PAGE_SIZE) {
    pages.push(items.slice(offset, offset + QUALITY_PRINT_PAGE_SIZE))
  }
  return pages
}

export function getQualityPrintRowNumber(pageIndex: number, rowIndex: number): number {
  return pageIndex * QUALITY_PRINT_PAGE_SIZE + rowIndex + 1
}
