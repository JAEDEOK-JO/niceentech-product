export function formatPrintQty(value: number): string {
  return value === 0 ? '' : String(value)
}

export function formatLotEnd(value: number): string {
  const num = Math.trunc(Number(value) || 0)
  if (num <= 0) return ''
  return String(num).padStart(5, '0')
}

export function chunkPages<T>(items: T[], pageSize: number): T[][] {
  if (pageSize <= 0) return [items]
  const pages: T[][] = []
  for (let offset = 0; offset < items.length; offset += pageSize) {
    pages.push(items.slice(offset, offset + pageSize))
  }
  return pages
}
