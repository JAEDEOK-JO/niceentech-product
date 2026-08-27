import { formatPositiveDecimal } from '@/features/main/productionPlanNumbers'

export function qtyCell(qty) {
  const n = Number(qty || 0)
  return n > 0 ? n.toLocaleString('ko-KR') : ''
}

export function inchCell(value) {
  const text = formatPositiveDecimal(value, { fixed: true })
  if (!text) return ''
  return Number(text).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function qtyUnitLabel(qty, unit) {
  const text = qtyCell(qty)
  return text ? `${text}${unit}` : ''
}

export function inchUnitLabel(value) {
  const text = inchCell(value)
  return text ? `${text}인치` : ''
}

export function amountLabel(qty, inch, unit, showInch = false) {
  const parts = [qtyUnitLabel(qty, unit)]
  if (showInch) parts.push(inchUnitLabel(inch))
  return parts.filter(Boolean).join(' · ')
}
