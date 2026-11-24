export const QUALITY_LIST_FIRST_PAGE_SIZE = 14
export const QUALITY_LIST_NEXT_PAGE_SIZE = 15

export function chunkQualityListPages<T>(items: T[]): T[][] {
  if (items.length === 0) return [[]]
  const pages: T[][] = [items.slice(0, QUALITY_LIST_FIRST_PAGE_SIZE)]
  for (let offset = QUALITY_LIST_FIRST_PAGE_SIZE; offset < items.length; offset += QUALITY_LIST_NEXT_PAGE_SIZE) {
    pages.push(items.slice(offset, offset + QUALITY_LIST_NEXT_PAGE_SIZE))
  }
  return pages
}

export function qualityListPageOffset(pageIndex: number) {
  if (pageIndex <= 0) return 0
  return QUALITY_LIST_FIRST_PAGE_SIZE + (pageIndex - 1) * QUALITY_LIST_NEXT_PAGE_SIZE
}
