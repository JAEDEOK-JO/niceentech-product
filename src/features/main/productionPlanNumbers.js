export const sanitizeInteger = (value) => String(value ?? '').replace(/\D/g, '')

export const sanitizeDecimalOne = (value) => {
  const raw = String(value ?? '').replace(/[^\d.]/g, '')
  const [integerPart = '', decimalPart = ''] = raw.split('.')
  return decimalPart ? `${integerPart}.${decimalPart.slice(0, 1)}` : integerPart
}

export const formatPositiveDecimal = (value, { fixed = false } = {}) => {
  const numberValue = Number(value ?? 0)
  if (!Number.isFinite(numberValue) || numberValue <= 0) return ''
  return fixed ? numberValue.toFixed(1) : String(numberValue)
}
