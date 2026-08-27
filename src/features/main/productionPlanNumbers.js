export const sanitizeInteger = (value) => String(value ?? '').replace(/\D/g, '')

export const sanitizeDecimalOne = (value) => {
  const raw = String(value ?? '').replace(/[^\d.]/g, '')
  const [integerPart = '', decimalPart = ''] = raw.split('.')
  return decimalPart ? `${integerPart}.${decimalPart.slice(0, 1)}` : integerPart
}

export const roundToOneDecimal = (value) => {
  const numberValue = Number(value ?? 0)
  if (!Number.isFinite(numberValue)) return 0
  return Number(numberValue.toFixed(1))
}

export const formatPositiveDecimal = (value, { fixed = false } = {}) => {
  const numberValue = roundToOneDecimal(value)
  if (numberValue <= 0) return ''
  if (fixed) return numberValue.toFixed(1)
  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(1)
}
