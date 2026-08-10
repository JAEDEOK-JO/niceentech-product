/** 회사리스트 날짜 표시/입력 (브라우저 locale 영문 date picker 회피) */

export function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/** DB registration_month(YYYY-MM-DD|YYYY-MM) → 화면 YYYY.MM */
export function formatRegistrationMonthDisplay(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const matched = raw.match(/^(\d{4})-(\d{2})/)
  if (matched) return `${matched[1]}.${matched[2]}`
  const digits = digitsOnly(raw)
  if (digits.length >= 6) return `${digits.slice(0, 4)}.${digits.slice(4, 6)}`
  return raw
}

/** 화면 YYYY.MM / YYYY-MM → 저장용 YYYY-MM */
export function parseRegistrationMonthInput(value) {
  const digits = digitsOnly(value).slice(0, 6)
  if (digits.length !== 6) return ''
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`
}

/** ISO YYYY-MM-DD → 화면 YYYY.MM.DD */
export function formatIsoDateDisplay(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (matched) return `${matched[1]}.${matched[2]}.${matched[3]}`
  const digits = digitsOnly(raw)
  if (digits.length === 8) return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`
  return raw
}

/** 화면 YYYY.MM.DD / YYYYMMDD → ISO YYYY-MM-DD */
export function parseIsoDateInput(value) {
  const digits = digitsOnly(value).slice(0, 8)
  if (digits.length !== 8) return ''
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}
