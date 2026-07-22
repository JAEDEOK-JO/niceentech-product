/** product_list.test_date → 2026년 01월 01일 */
export function formatProductionPlanDateLabel(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const already = raw.match(/^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (already) {
    const y = already[1]
    const m = String(already[2]).padStart(2, '0')
    const d = String(already[3]).padStart(2, '0')
    return `${y}년 ${m}월 ${d}일`
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    return `${iso[1]}년 ${iso[2]}월 ${iso[3]}일`
  }

  const dotted = raw.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/)
  if (dotted) {
    return `${dotted[1]}년 ${String(dotted[2]).padStart(2, '0')}월 ${String(dotted[3]).padStart(2, '0')}일`
  }

  return raw
}

export function formatProductionPlanTitle(testDate: unknown, initial: unknown): string {
  const dateLabel = formatProductionPlanDateLabel(testDate)
  const drawingNo = String(initial ?? '').trim()
  if (dateLabel && drawingNo) return `${dateLabel} 생산계획표 · ${drawingNo}`
  if (dateLabel) return `${dateLabel} 생산계획표`
  return drawingNo || '-'
}
