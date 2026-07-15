const formatQty = (value) => Math.round(Number(value) || 0).toLocaleString('ko-KR')

export const formatHeadQty = (value) => `${formatQty(value)}헤드`

export const formatRate = (rate) => {
  const numeric = Number(rate)
  if (!Number.isFinite(numeric)) return '-'
  return `${numeric.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`
}

export { formatQty }

export const buildSummaryCards = ({ summary }) => [
  {
    key: 'produced',
    label: '총생산',
    value: formatHeadQty(summary.producedHeadQty),
    sub: `검수일 · ${formatQty(summary.producedSiteCount)}개 현장`,
    tone: 'indigo',
  },
  {
    key: 'drawing',
    label: '도면배포',
    value: formatHeadQty(summary.drawingHeadQty),
    sub: `배포일 · ${formatQty(summary.drawingSiteCount)}개 현장`,
    tone: 'sky',
  },
  {
    key: 'late',
    label: '목요일 12시 이후',
    value: formatHeadQty(summary.lateDrawingHeadQty),
    sub: `지연 ${formatRate(summary.lateDrawingRate)}`,
    tone: 'amber',
  },
  {
    key: 'conversion',
    label: '당월배포 생산완료',
    value: formatHeadQty(summary.drawingProducedHeadQty),
    sub: `전환율 ${formatRate(summary.drawingConversionRate)}`,
    tone: 'emerald',
  },
]
