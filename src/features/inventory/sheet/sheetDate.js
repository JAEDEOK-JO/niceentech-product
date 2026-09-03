const pad2 = (value) => String(value).padStart(2, '0')

export const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

export const formatYyMmDd = (year, month, day) => {
  if (year === '' || year == null || !month || !day) return ''
  return `${pad2(String(year).slice(-2))}.${pad2(month)}.${pad2(day)}`
}

export const datePartsFromIso = (value) => {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return { year: '', month: '', day: '', transactionDate: String(value ?? '') }
  }
  return {
    year: Number(match[1].slice(2)),
    month: Number(match[2]),
    day: Number(match[3]),
    transactionDate: `${match[1]}-${match[2]}-${match[3]}`,
  }
}

const toSheetDateParts = (fullYear, month, day) => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return {
    year: Number(String(fullYear).slice(-2)),
    month,
    day,
    transactionDate: `${fullYear}-${pad2(month)}-${pad2(day)}`,
  }
}

export const parseSheetDate = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return null

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return toSheetDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const dotted = text.match(/^(\d{2}|\d{4})\.(\d{1,2})\.(\d{1,2})$/)
  const digits = text.replace(/\D/g, '')
  const fromDigits =
    digits.length === 8
      ? digits.match(/^(\d{4})(\d{2})(\d{2})$/)
      : digits.length === 6
        ? digits.match(/^(\d{2})(\d{2})(\d{2})$/)
        : null
  const matched = dotted ?? fromDigits
  if (!matched) return null

  const yearRaw = matched[1]
  const fullYear = yearRaw.length === 4 ? Number(yearRaw) : 2000 + Number(yearRaw)
  return toSheetDateParts(fullYear, Number(matched[2]), Number(matched[3]))
}

export const displayColumnDate = (column) => {
  if (column?.dateDraft != null && column.dateDraft !== '') return String(column.dateDraft)
  if (column?.year !== '' && column?.year !== undefined && column?.month && column?.day) {
    return formatYyMmDd(column.year, column.month, column.day)
  }
  const parts = datePartsFromIso(column?.transactionDate)
  if (parts.year === '') return ''
  return formatYyMmDd(parts.year, parts.month, parts.day)
}

export const applySheetDate = (column, value) => {
  column.dateDraft = value
  const parsed = parseSheetDate(value)
  if (!parsed) return false
  Object.assign(column, parsed)
  column.dateDraft = formatYyMmDd(parsed.year, parsed.month, parsed.day)
  return true
}
