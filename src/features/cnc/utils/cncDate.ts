import type { CncItem } from '../types/cnc'

export function formatCncShortDate(value: string): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    const matched = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (!matched) return ''
    const [, year, month, day] = matched
    return `${String(year).slice(-2)}.${Number(month)}.${Number(day)}`
  }

  const yy = String(date.getFullYear()).slice(-2)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${yy}.${month}.${day}`
}

export function sortCncItems(items: CncItem[]): CncItem[] {
  return [...items].sort((left, right) => {
    if (left.isCompleted !== right.isCompleted) {
      return left.isCompleted ? 1 : -1
    }

    const leftTime = new Date(left.createdAt).getTime()
    const rightTime = new Date(right.createdAt).getTime()
    return rightTime - leftTime
  })
}
