const formatQty = (value) => Math.round(Number(value) || 0).toLocaleString('ko-KR')

export const formatHeadQty = (value) => `${formatQty(value)}헤드`

export const formatWorkBreakdown = (totalHeadQty, inchQty) => {
  const base = formatHeadQty(totalHeadQty)
  const inch = Number(inchQty) || 0
  return inch > 0 ? `${base} (${formatQty(inch)}인치 작업 포함)` : base
}

export const formatRate = (rate) => {
  const numeric = Number(rate)
  if (!Number.isFinite(numeric)) return '-'
  return `${numeric.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`
}

// 결산 요약 카드
export const buildSummaryCards = ({ summary, shipmentSummary, drawingSummary }) => [
  {
    key: 'total',
    label: '총 생산',
    value: formatHeadQty(summary.totalHeadQty),
    sub: summary.inchQty > 0 ? `${formatQty(summary.inchQty)}인치 작업 포함` : `${formatQty(summary.siteCount)}개 현장`,
    tone: 'indigo',
  },
  {
    key: 'avg',
    label: '월평균 생산',
    value: formatHeadQty(summary.monthlyAvgHeadQty),
    sub: `${formatQty(summary.siteCount)}개 현장 처리`,
    tone: 'sky',
  },
  {
    key: 'best',
    label: '최고 실적 월',
    value: summary.bestMonth ? `${summary.bestMonth.label} ${formatHeadQty(summary.bestMonth.totalHeadQty)}` : '-',
    sub: summary.worstMonth ? `최저 ${summary.worstMonth.label} ${formatHeadQty(summary.worstMonth.totalHeadQty)}` : '',
    tone: 'emerald',
  },
  {
    key: 'shipped',
    label: '출하 완료율',
    value: formatRate(shipmentSummary.shippedRate),
    sub: `미출하 ${formatHeadQty(shipmentSummary.unshippedHeadQty)}`,
    tone: 'amber',
  },
  {
    key: 'drawing',
    label: '도면배포 소화율',
    value: formatRate(drawingSummary.conversionRate),
    sub: `배포 ${formatHeadQty(drawingSummary.totalHeadQty)} 중 생산 ${formatHeadQty(drawingSummary.producedHead)}`,
    tone: 'violet',
  },
]

// 결산 총평 (헤드라인 + 항목별 코멘트)
export const buildReview = ({ summary, monthlyProduction, shipmentSummary, drawingSummary, periodLabel }) => {
  const items = []

  const headline = `${periodLabel} 총 ${formatQty(summary.siteCount)}개 현장, ${formatWorkBreakdown(
    summary.totalHeadQty,
    summary.inchQty,
  )}를 생산했습니다. 월평균 ${formatHeadQty(summary.monthlyAvgHeadQty)} 수준입니다.`

  if (summary.bestMonth && summary.worstMonth && summary.bestMonth.key !== summary.worstMonth.key) {
    const gapRate =
      summary.worstMonth.totalHeadQty > 0
        ? ((summary.bestMonth.totalHeadQty - summary.worstMonth.totalHeadQty) / summary.worstMonth.totalHeadQty) * 100
        : 0
    items.push({
      key: 'gap',
      title: '월별 편차',
      text: `최고 ${summary.bestMonth.label}(${formatHeadQty(summary.bestMonth.totalHeadQty)})과 최저 ${
        summary.worstMonth.label
      }(${formatHeadQty(summary.worstMonth.totalHeadQty)})의 차이가 ${formatRate(gapRate)}입니다. ${
        gapRate >= 50 ? '월별 물량 기복이 큰 편이라 인력·설비 운영 계획 시 감안이 필요합니다.' : '월별 물량이 비교적 고르게 유지됐습니다.'
      }`,
    })
  }

  const half = monthlyProduction.length === 6 ? monthlyProduction : []
  if (half.length === 6) {
    const firstQ = half.slice(0, 3).reduce((sum, month) => sum + month.totalHeadQty, 0)
    const secondQ = half.slice(3).reduce((sum, month) => sum + month.totalHeadQty, 0)
    if (firstQ > 0) {
      const changeRate = ((secondQ - firstQ) / firstQ) * 100
      items.push({
        key: 'trend',
        title: '분기 흐름',
        text: `전반 3개월 ${formatHeadQty(firstQ)} → 후반 3개월 ${formatHeadQty(secondQ)}로 ${
          changeRate >= 0 ? `${formatRate(changeRate)} 증가했습니다.` : `${formatRate(Math.abs(changeRate))} 감소했습니다.`
        }`,
      })
    }
  }

  if (shipmentSummary.unshippedHeadQty > 0) {
    items.push({
      key: 'unshipped',
      title: '미출하 이월',
      text: `기간 내 생산분 중 ${formatHeadQty(shipmentSummary.unshippedHeadQty)}(${formatQty(
        shipmentSummary.unshippedSiteCount,
      )}개 현장)이 아직 출하되지 않아 다음 기간으로 이월됩니다. 출하 완료율은 ${formatRate(shipmentSummary.shippedRate)}입니다.`,
    })
  }

  if (drawingSummary.totalHeadQty > 0) {
    const rate = drawingSummary.conversionRate
    items.push({
      key: 'drawing',
      title: '도면배포 대비',
      text: `기간 내 배포된 도면 ${formatHeadQty(drawingSummary.totalHeadQty)} 대비 생산 ${formatHeadQty(
        drawingSummary.producedHead,
      )}로 소화율 ${formatRate(rate)}입니다. ${
        rate >= 100
          ? '배포분을 모두 소화하고 이월 도면까지 처리했습니다.'
          : `약 ${formatHeadQty(drawingSummary.totalHeadQty - drawingSummary.producedHead)}가 미착수·진행 중으로 남아 있습니다.`
      }`,
    })
  }

  return { headline, items }
}

// 다음 반기 전망
export const buildOutlook = ({ summary, shipmentSummary, year, half }) => {
  const nextLabel = half === 1 ? `${year}년 하반기` : `${year + 1}년 상반기`
  const projected = summary.monthlyAvgHeadQty * 6
  const rows = [
    {
      key: 'projection',
      label: `${nextLabel} 예상 생산(월평균 유지 시)`,
      value: formatHeadQty(projected),
    },
    {
      key: 'carryover',
      label: '이월 미출하 물량',
      value: formatHeadQty(shipmentSummary.unshippedHeadQty),
    },
  ]
  const note =
    shipmentSummary.unshippedHeadQty > 0
      ? `${nextLabel}는 미출하 ${formatHeadQty(shipmentSummary.unshippedHeadQty)} 출하 처리와 함께 시작됩니다.`
      : ''
  return { nextLabel, rows, note }
}
