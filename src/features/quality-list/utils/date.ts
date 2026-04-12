const pad = (value: number) => String(value).padStart(2, '0')

export function getNextTuesday(base: Date): Date {
  const date = new Date(base)
  const weekday = date.getDay()
  const jsTuesday = 2
  let diff = jsTuesday - weekday
  if (diff < 0) diff += 7
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function moveByWeeks(date: Date, weeks: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + weeks * 7)
  next.setHours(0, 0, 0, 0)
  return next
}

export function formatQualityDate(date: Date): string {
  return `${date.getFullYear()}년 ${pad(date.getMonth() + 1)}월 ${pad(date.getDate())}일`
}

export function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseQualityDate(value: string): Date {
  const match = value.match(/^(\d{4})년 (\d{2})월 (\d{2})일$/)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }

  const iso = new Date(value)
  if (!Number.isNaN(iso.getTime())) {
    iso.setHours(0, 0, 0, 0)
    return iso
  }

  return getNextTuesday(new Date())
}

export function formatDisplayDate(value: string | Date): string {
  const date = value instanceof Date ? value : parseQualityDate(value)
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}
