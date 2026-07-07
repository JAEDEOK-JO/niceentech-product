export const MONTHLY_SALES_TARGET = 600000000
// 회사 기준 헤드당 평균 단가 (고정값)
export const HEAD_UNIT_PRICE = 15000
// 용접인치(Dia-Inch) 환산 계수: 인치 = 배관 구경(인치) × 용접 개소.
// 헤드 용접 1개소 ≈ 1인치 조인트이므로 1인치 = 헤드 1개분 작업량으로 환산한다.
export const INCH_TO_HEAD_RATIO = 1
const WEEKS_PER_MONTH = 4.33
const CHANGE_THRESHOLD = 5
// 상세 흐름 분석은 최근 구간만 다뤄 카드 수를 제한한다.
const FLOW_DETAIL_COUNT = 3

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

// 1억 이상은 '억', 그 미만은 '만원' 단위로 전체 금액 표시 (예: 5,800만원)
export const formatMoneyAmount = (value) => {
  const amount = Math.abs(toNumber(value))
  const prefix = toNumber(value) < 0 ? '-' : ''

  if (amount >= 100000000) {
    return `${prefix}${(amount / 100000000).toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}억`
  }
  if (amount >= 10000) {
    return `${prefix}${Math.round(amount / 10000).toLocaleString('ko-KR')}만원`
  }
  return `${prefix}${Math.round(amount).toLocaleString('ko-KR')}원`
}

const formatBillionValue = formatMoneyAmount

const formatWonValue = (value) => `${Math.round(toNumber(value)).toLocaleString('ko-KR')}원`

const changeRate = (previous, current) => {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

// 작업량(헤드 환산) = 헤드 + 인치 × 환산계수. 인치가 기록된 현장의 작업 시간을 반영한다.
const productionWorkQty = (month) =>
  toNumber(month.productionHeadQty) + toNumber(month.productionInchQty) * INCH_TO_HEAD_RATIO
const drawingWorkQty = (month) =>
  toNumber(month.drawingHeadQty) + toNumber(month.drawingInchQty) * INCH_TO_HEAD_RATIO

// 헤드는 항상 전체 수량을 보여주고, 인치는 난이도 참고 정보로만 병기한다.
const formatWorkBreakdown = (totalHeadQty, inchQty) => {
  const head = Math.round(toNumber(totalHeadQty)).toLocaleString('ko-KR')
  const inch = Math.round(toNumber(inchQty))
  return inch > 0 ? `${head}헤드 (${inch.toLocaleString('ko-KR')}인치 작업)` : `${head}헤드`
}

export const formatChangeRate = (rate) => {
  if (rate === null) return '-'
  const rounded = Math.round(rate)
  if (rounded > 0) return `+${rounded}%`
  return `${rounded}%`
}

export const buildMonthComparisons = (metrics, partialCurrentMonth = null) => {
  const comparisons = []
  if (metrics.length >= 2) {
    comparisons.push(
      ...metrics.slice(1).map((month, index) => {
        const previous = metrics[index]
        return {
          key: month.key,
          label: `${previous.label} → ${month.label}`,
          order: changeRate(previous.orderHeadQty, month.orderHeadQty),
          sales: changeRate(previous.salesAmount, month.salesAmount),
          drawing: changeRate(drawingWorkQty(previous), drawingWorkQty(month)),
          received: changeRate(previous.receivedTon, month.receivedTon),
          production: changeRate(productionWorkQty(previous), productionWorkQty(month)),
        }
      }),
    )
  }

  if (partialCurrentMonth && metrics.length > 0) {
    const previous = metrics[metrics.length - 1]
    comparisons.push({
      key: partialCurrentMonth.key,
      label: `${previous.label} → ${partialCurrentMonth.comparisonLabel ?? `${partialCurrentMonth.label} 현재까지`}`,
      order: changeRate(previous.orderHeadQty, partialCurrentMonth.orderHeadQty),
      sales: changeRate(previous.salesAmount, partialCurrentMonth.salesAmount),
      drawing: changeRate(drawingWorkQty(previous), drawingWorkQty(partialCurrentMonth)),
      received: changeRate(previous.receivedTon, partialCurrentMonth.receivedTon),
      production: changeRate(productionWorkQty(previous), productionWorkQty(partialCurrentMonth)),
      isPartial: true,
    })
  }

  return comparisons
}

// 기준 단가(15,000원)로 "그 달에 한 일의 매출 가치"를 환산한다.
// 작업량은 헤드 + 인치 환산분을 합산하고, 비교 대상 매출은 헤드 매출만 사용해 단가 기준과 일치시킨다.
export const buildValueChain = (metrics) => {
  const totalHeadSales = metrics.reduce((sum, month) => sum + toNumber(month.salesAmountHead), 0)
  const totalProductionWork = metrics.reduce((sum, month) => sum + productionWorkQty(month), 0)
  if (totalProductionWork <= 0) return null

  const actualSalesPerHead = totalHeadSales > 0 ? totalHeadSales / totalProductionWork : null

  const rows = metrics.map((month) => {
    const productionWork = productionWorkQty(month)
    const drawingWork = drawingWorkQty(month)
    const productionValue = productionWork * HEAD_UNIT_PRICE
    const drawingValue = drawingWork * HEAD_UNIT_PRICE
    const headSales = toNumber(month.salesAmountHead)
    const salesVsProduction = productionValue > 0 && headSales > 0 ? (headSales / productionValue) * 100 : null
    const productionVsDrawing = drawingWork > 0 ? (productionWork / drawingWork) * 100 : null

    return {
      key: month.key,
      label: month.label,
      salesAmount: toNumber(month.salesAmount),
      salesAmountHead: headSales,
      drawingHeadQty: toNumber(month.drawingHeadQty),
      drawingInchQty: toNumber(month.drawingInchQty),
      drawingTotalHeadQty: toNumber(month.drawingTotalHeadQty),
      drawingWorkQty: drawingWork,
      productionHeadQty: toNumber(month.productionHeadQty),
      productionInchQty: toNumber(month.productionInchQty),
      productionTotalHeadQty: toNumber(month.productionTotalHeadQty),
      productionWorkQty: productionWork,
      drawingValue,
      productionValue,
      salesVsProduction,
      productionVsDrawing,
    }
  })

  return { salesPerHead: HEAD_UNIT_PRICE, actualSalesPerHead, rows }
}

const describeDirection = (rate) => {
  if (rate === null) return null
  if (rate <= -CHANGE_THRESHOLD) return 'down'
  if (rate >= CHANGE_THRESHOLD) return 'up'
  return 'flat'
}

const directionText = (rate) => {
  if (rate === null) return '데이터 없음'
  const direction = describeDirection(rate)
  if (direction === 'down') return `${formatChangeRate(rate)} 감소`
  if (direction === 'up') return `${formatChangeRate(rate)} 증가`
  return `비슷한 수준(${formatChangeRate(rate)})`
}

const formatHeadValue = (value) => `${Math.round(toNumber(value)).toLocaleString('ko-KR')}헤드`
const formatTonValue = (value) => `${toNumber(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}톤`
const average = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

// 목표 달성 그룹
const buildTargetGroup = (metrics, target) => {
  const items = []
  const monthCount = metrics.length

  const totalSales = metrics.reduce((sum, month) => sum + toNumber(month.salesAmount), 0)
  const totalTarget = target * monthCount
  const totalRate = totalTarget > 0 ? Math.round((totalSales / totalTarget) * 100) : 0
  const totalGap = totalTarget - totalSales
  const achievedCount = metrics.filter((month) => toNumber(month.salesAmount) >= target).length

  items.push({
    tone: totalRate >= 100 ? 'good' : 'bad',
    title: `${monthCount}개월 합계 ${formatBillionValue(totalSales)} — 목표 ${formatBillionValue(totalTarget)}의 ${totalRate}%`,
    facts: metrics.map((month) => ({
      label: month.label,
      value: `${formatBillionValue(month.salesAmount)} (${target > 0 ? Math.round((month.salesAmount / target) * 100) : 0}%)`,
    })),
    detail: totalGap > 0
      ? `${monthCount}개월 중 목표(월 ${formatBillionValue(target)})를 달성한 달은 ${achievedCount}개월입니다. 누적 부족분은 ${formatBillionValue(totalGap)}로, 월평균 ${formatBillionValue(totalGap / monthCount)}씩 모자랐습니다. 이 부족분을 메우려면 아래 "목표 달성 기준"의 부서별 수치만큼 물량이 뒷받침되어야 합니다.`
      : `${monthCount}개월 누적으로 목표를 초과 달성했습니다. 달성한 달은 ${achievedCount}개월입니다.`,
  })

  // 최근 3개월 vs 이전 3개월 추세
  if (monthCount >= 6) {
    const firstHalf = metrics.slice(0, monthCount - 3)
    const recentHalf = metrics.slice(monthCount - 3)
    const firstAvg = average(firstHalf.map((month) => toNumber(month.salesAmount)))
    const recentAvg = average(recentHalf.map((month) => toNumber(month.salesAmount)))
    const trendRate = changeRate(firstAvg, recentAvg)
    const trendDirection = describeDirection(trendRate)

    items.push({
      tone: trendDirection === 'up' ? 'good' : trendDirection === 'down' ? 'bad' : 'info',
      title: `추세: 최근 3개월 평균이 이전보다 ${directionText(trendRate)}`,
      facts: [
        { label: `${firstHalf[0].label}~${firstHalf[firstHalf.length - 1].label} 평균`, value: formatBillionValue(firstAvg) },
        { label: `${recentHalf[0].label}~${recentHalf[recentHalf.length - 1].label} 평균`, value: formatBillionValue(recentAvg) },
      ],
      detail: trendDirection === 'up'
        ? `매출 체력이 좋아지는 방향입니다. 한 달 단위 등락보다 이 평균 추세가 실제 흐름에 가깝습니다.`
        : trendDirection === 'down'
          ? `매출 체력이 약해지는 방향입니다. 최근 도면배포·수주량이 함께 줄고 있는지 아래 흐름 분석에서 확인하세요.`
          : `평균 수준이 유지되고 있습니다. 월별 등락은 출하·청구 시점 차이일 가능성이 큽니다.`,
    })
  }

  return { heading: '매출 목표', items }
}

// 수주 그룹: 확정 수주(공급 파이프라인 최상단)와 수주 예정(미래 일감)
const buildOrderGroup = (metrics, expectedOrders) => {
  const items = []
  const monthCount = metrics.length
  if (monthCount === 0) return { heading: '수주 (영업)', items }

  const totalOrderHead = metrics.reduce((sum, month) => sum + toNumber(month.orderHeadQty), 0)
  const totalOrderNoHead = metrics.reduce((sum, month) => sum + toNumber(month.orderNoHeadCount), 0)
  const totalProductionHead = metrics.reduce((sum, month) => sum + toNumber(month.productionTotalHeadQty), 0)
  const orderValue = totalOrderHead * HEAD_UNIT_PRICE
  const coverage = totalProductionHead > 0 ? Math.round((totalOrderHead / totalProductionHead) * 100) : null
  const noHeadNote = totalOrderNoHead > 0
    ? ` 헤드수가 입력되지 않은 수주 ${totalOrderNoHead}건은 0으로 집계돼 실제 수주량은 이보다 많을 수 있습니다.`
    : ''

  items.push({
    tone: coverage === null ? 'info' : coverage >= 100 ? 'good' : coverage >= 70 ? 'warn' : 'bad',
    title: `신규 수주 ${formatHeadValue(totalOrderHead)} ≈ ${formatBillionValue(orderValue)} — 같은 기간 생산의 ${coverage === null ? '-' : `${coverage}%`}`,
    facts: metrics.map((month) => ({
      label: month.label,
      value: formatHeadValue(month.orderHeadQty),
    })),
    detail: coverage === null
      ? `수주는 도면배포·생산·매출로 이어지는 가장 앞 단계의 물량입니다. 생산 데이터가 없어 비교는 생략합니다.${noHeadNote}`
      : coverage >= 100
        ? `이 기간에 생산으로 소화한 물량(${formatHeadValue(totalProductionHead)})보다 새로 수주한 물량이 많습니다. 일감이 유지·증가하는 건강한 상태로, 뒤 공정(설계·생산)이 이 물량을 소화할 수 있는지가 다음 관건입니다.${noHeadNote}`
        : `이 기간에 생산으로 소화한 물량(${formatHeadValue(totalProductionHead)})보다 새로 수주한 물량이 적습니다. 쌓아둔 일감을 꺼내 쓰는 중이라, 이 상태가 이어지면 몇 달 뒤 도면배포와 생산이 함께 줄어듭니다. 신규 수주 확보가 시급합니다.${noHeadNote}`,
  })

  if (expectedOrders && expectedOrders.totalHeadQty > 0) {
    const avgMonthlyProduction = monthCount > 0 ? totalProductionHead / monthCount : 0
    const monthsOfWork = avgMonthlyProduction > 0 ? expectedOrders.totalHeadQty / avgMonthlyProduction : null
    const expectedValue = expectedOrders.totalHeadQty * HEAD_UNIT_PRICE

    items.push({
      tone: 'info',
      title: `수주 예정 ${formatHeadValue(expectedOrders.totalHeadQty)} (${expectedOrders.count}건) ≈ ${formatBillionValue(expectedValue)}`,
      facts: expectedOrders.byMonth.map((entry) => ({
        label: entry.label,
        value: formatHeadValue(entry.headQty),
      })),
      detail: monthsOfWork !== null
        ? `아직 확정 전인 예정 물량입니다. 헤드당 ${formatWonValue(HEAD_UNIT_PRICE)} 기준 약 ${formatBillionValue(expectedValue)}의 매출 여력이며, 월평균 생산량(${formatHeadValue(avgMonthlyProduction)}) 기준 약 ${monthsOfWork.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}개월치 일감입니다. 이 물량이 제때 확정되면 도면배포~생산 라인이 끊기지 않습니다.`
        : `아직 확정 전인 예정 물량입니다. 헤드당 ${formatWonValue(HEAD_UNIT_PRICE)} 기준 약 ${formatBillionValue(expectedValue)}의 매출 여력입니다.`,
    })
  } else {
    items.push({
      tone: 'warn',
      title: `등록된 수주 예정 없음`,
      facts: [],
      detail: `현재 등록된 수주 예정 물량이 없습니다. 진행 중인 물량이 소진되면 이후 일감이 비게 되므로, 영업 단계에서 예정 물량 확보가 필요합니다.`,
    })
  }

  return { heading: '수주 (영업)', items }
}

// 월별 흐름 그룹: 최근 구간의 매출 변화를 상류 공정과 연결해 설명
const buildFlowGroup = (metrics) => {
  const items = []
  const startIndex = Math.max(1, metrics.length - FLOW_DETAIL_COUNT)

  for (let index = startIndex; index < metrics.length; index += 1) {
    const previous = metrics[index - 1]
    const current = metrics[index]

    const salesRate = changeRate(previous.salesAmount, current.salesAmount)
    const orderRate = changeRate(previous.orderHeadQty, current.orderHeadQty)
    const drawingRate = changeRate(previous.drawingHeadQty, current.drawingHeadQty)
    const receivedRate = changeRate(previous.receivedTon, current.receivedTon)
    const productionRate = changeRate(previous.productionHeadQty, current.productionHeadQty)
    const salesDirection = describeDirection(salesRate)

    const facts = [
      { label: '매출', value: `${formatBillionValue(previous.salesAmount)} → ${formatBillionValue(current.salesAmount)}` },
      { label: '수주', value: formatChangeRate(orderRate) },
      { label: '도면배포', value: formatChangeRate(drawingRate) },
      { label: '입고', value: formatChangeRate(receivedRate) },
      { label: '생산', value: formatChangeRate(productionRate) },
    ]

    if (salesDirection === 'down') {
      const sameDirection = [
        { name: '수주', rate: orderRate },
        { name: '도면배포', rate: drawingRate },
        { name: '입고', rate: receivedRate },
        { name: '생산', rate: productionRate },
      ].filter((item) => describeDirection(item.rate) === 'down')

      items.push({
        tone: 'bad',
        title: `${previous.label} → ${current.label}: 매출 ${formatBillionValue(previous.salesAmount - current.salesAmount)} 감소 (${formatChangeRate(salesRate)})`,
        facts,
        detail: sameDirection.length > 0
          ? `${sameDirection.map((item) => item.name).join('·')}이 매출과 함께 줄었습니다. 수주·도면배포·입고는 생산보다 앞에 있는 공정이라, 여기가 줄면 한두 달 뒤 생산과 매출이 순서대로 줄어듭니다. 원인은 상류 쪽(수주량·설계 처리·자재 발주)에서 찾아야 합니다.`
          : `생산은 줄지 않았는데 매출만 줄었습니다. 일은 정상적으로 했다는 뜻이므로, ${current.label} 생산분의 출하가 늦어졌거나 청구가 다음 달로 밀린 것이 원인일 가능성이 큽니다. 미청구 물량을 확인하세요.`,
      })
    } else if (salesDirection === 'up') {
      items.push({
        tone: 'good',
        title: `${previous.label} → ${current.label}: 매출 ${formatBillionValue(current.salesAmount - previous.salesAmount)} 증가 (${formatChangeRate(salesRate)})`,
        facts,
        detail: describeDirection(productionRate) === 'down'
          ? `생산은 줄었는데 매출이 늘었습니다. 이전 달에 생산해 둔 물량이 이번 달에 출하·청구된 것으로, 밀린 매출이 회수된 구간입니다. 다음 달에 반대로 매출이 꺼질 수 있으니 이번 달 생산량을 함께 봐야 합니다.`
          : `도면배포·생산이 매출과 같은 방향으로 움직였습니다. 앞 공정이 늘고 매출도 늘어난 건강한 구간입니다.`,
      })
    } else if (salesRate !== null) {
      items.push({
        tone: 'info',
        title: `${previous.label} → ${current.label}: 매출 ${directionText(salesRate)}`,
        facts,
        detail: `매출 변동이 ±${CHANGE_THRESHOLD}% 이내로 안정적인 구간입니다.`,
      })
    }
  }

  return {
    heading: startIndex === 1 ? '월별 흐름' : `월별 흐름 (최근 ${items.length}개 구간)`,
    items,
  }
}

// 일량 대비 매출 그룹: 그 달에 한 일의 돈 가치와 실제 헤드 매출 비교
const buildWorkValueGroup = (valueChain) => {
  const items = []
  if (!valueChain) return { heading: '한 일 대비 매출', items }

  items.push({
    tone: 'info',
    title: `기준 단가: 헤드 1개 = ${formatWonValue(HEAD_UNIT_PRICE)}`,
    facts: valueChain.actualSalesPerHead !== null
      ? [
          { label: '회사 기준', value: formatWonValue(HEAD_UNIT_PRICE) },
          { label: '기간 실제 평균', value: formatWonValue(valueChain.actualSalesPerHead) },
        ]
      : [{ label: '회사 기준', value: formatWonValue(HEAD_UNIT_PRICE) }],
    detail: `회사에서 정한 헤드당 평균 단가로 "그 달에 생산한 물량이 돈으로 얼마짜리 일이었는지"를 환산해, 헤드 매출과 비교합니다. 100%면 한 만큼 매출이 잡힌 것이고, 낮으면 청구가 밀린 것, 높으면 이전 달 물량이 회수된 것입니다.${
      valueChain.actualSalesPerHead !== null
        ? ` 참고로 이 기간 실제 평균(헤드 매출 ÷ 생산 헤드)은 ${formatWonValue(valueChain.actualSalesPerHead)}로, 기준과 차이가 크면 단가 구성이나 청구 시점을 확인해야 합니다.`
        : ''
    }`,
  })

  const anomalyRows = valueChain.rows.filter((row) => {
    if (row.salesVsProduction === null) return false
    const ratio = Math.round(row.salesVsProduction)
    return ratio < 85 || ratio > 115
  })
  const normalRows = valueChain.rows.filter((row) => {
    if (row.salesVsProduction === null) return false
    const ratio = Math.round(row.salesVsProduction)
    return ratio >= 85 && ratio <= 115
  })

  for (const row of anomalyRows) {
    const ratio = Math.round(row.salesVsProduction)
    const gap = row.salesAmountHead - row.productionValue

    const facts = [
      { label: '생산', value: formatWorkBreakdown(row.productionTotalHeadQty, row.productionInchQty) },
      { label: '일의 가치', value: `≈ ${formatBillionValue(row.productionValue)}` },
      { label: '헤드 매출', value: formatBillionValue(row.salesAmountHead) },
    ]

    if (ratio < 85) {
      items.push({
        tone: 'warn',
        title: `${row.label}: 한 일의 ${ratio}%만 매출로 회수`,
        facts,
        detail: `약 ${formatBillionValue(Math.abs(gap))}어치가 청구되지 않고 다음 달로 넘어갔습니다. 다음 달 매출이 그만큼 늘어야 정상이며, 늘지 않으면 미청구·미출하 물량을 점검해야 합니다.`,
      })
    } else {
      items.push({
        tone: 'info',
        title: `${row.label}: 한 일보다 매출이 큼 (${ratio}%)`,
        facts,
        detail: `이전 달 생산분 약 ${formatBillionValue(gap)}이 ${row.label}에 청구됐습니다. 이 달의 매출이 좋아 보여도 그만큼은 이전 달의 성과입니다.`,
      })
    }
  }

  if (normalRows.length > 0) {
    items.push({
      tone: 'good',
      title: `${normalRows.map((row) => row.label).join('·')}: 한 만큼 매출 발생 (85~115%)`,
      facts: normalRows.map((row) => ({
        label: row.label,
        value: `${Math.round(row.salesVsProduction)}%`,
      })),
      detail: `생산한 물량이 같은 달 안에 정상적으로 출하·청구된 달입니다.`,
    })
  }

  return { heading: '한 일 대비 매출', items }
}

// 미출하 재고 그룹: 작업완료 후 출하되지 않아 매출로 못 잡힌 물량
const buildUnshippedGroup = (unshippedBacklog, metrics) => {
  const items = []
  if (!unshippedBacklog) return { heading: '미출하 재고', items }

  const workQty = toNumber(unshippedBacklog.headQty) + toNumber(unshippedBacklog.inchQty) * INCH_TO_HEAD_RATIO
  const lockedValue = workQty * HEAD_UNIT_PRICE

  if (workQty <= 0) {
    items.push({
      tone: 'good',
      title: `작업완료 물량이 모두 출하됐습니다`,
      facts: [],
      detail: `완료 후 출하 대기 중인 물량이 없습니다. 생산 → 출하 → 매출 흐름이 막힘 없이 돌고 있습니다.`,
    })
    return { heading: '미출하 재고', items }
  }

  const monthCount = metrics.length
  const avgMonthlySales = monthCount > 0
    ? metrics.reduce((sum, month) => sum + toNumber(month.salesAmount), 0) / monthCount
    : 0
  const salesShare = avgMonthlySales > 0 ? Math.round((lockedValue / avgMonthlySales) * 100) : null

  items.push({
    tone: salesShare !== null && salesShare >= 50 ? 'warn' : 'info',
    title: `출하 대기 ${formatWorkBreakdown(unshippedBacklog.totalHeadQty, unshippedBacklog.inchQty)} ≈ ${formatBillionValue(lockedValue)} 묶여 있음`,
    facts: [
      { label: '현장 수', value: `${toNumber(unshippedBacklog.count).toLocaleString('ko-KR')}건` },
      { label: '환산 매출', value: `≈ ${formatBillionValue(lockedValue)}` },
      ...(salesShare !== null ? [{ label: '월평균 매출 대비', value: `${salesShare}%` }] : []),
    ],
    detail: `출하완료가 찍히지 않은 완료 물량 전체입니다. 용접 등 잔여 공정이 남아 아직 출하할 수 없는 물량도 포함되어 있을 수 있습니다. 매출 입력이 출하 기준이라 이 금액은 출하 전까지 매출로 잡히지 않습니다.${
      salesShare !== null && salesShare >= 50
        ? ` 월평균 매출의 절반이 넘는 규모이므로, 잔여 공정 대기인지 출하 지연(현장 일정·운송·검수)인지 구분해서 원인별로 해소해야 합니다.`
        : ` 잔여 공정과 출하 일정을 점검해 순차적으로 내보낼수록 매출 인식이 빨라집니다.`
    }`,
  })

  return { heading: '미출하 재고', items }
}

// 공정 병목 그룹: 도면배포 → 생산 전환율
const buildBottleneckGroup = (valueChain) => {
  const items = []
  if (!valueChain) return { heading: '공정 흐름', items }

  const lowRows = []
  const highRows = []
  for (const row of valueChain.rows) {
    if (row.productionVsDrawing === null) continue
    const conversion = Math.round(row.productionVsDrawing)
    if (conversion < 70) lowRows.push({ row, conversion })
    else if (conversion > 115) highRows.push({ row, conversion })
  }

  if (lowRows.length > 0) {
    items.push({
      tone: lowRows.length >= 2 ? 'bad' : 'warn',
      title: `배포 물량을 다 생산하지 못한 달: ${lowRows.map((item) => item.row.label).join('·')}`,
      facts: lowRows.map((item) => ({
        label: item.row.label,
        value: `배포 ${formatWorkBreakdown(item.row.drawingTotalHeadQty, item.row.drawingInchQty)} 중 ${item.conversion}% 생산`,
      })),
      detail: lowRows.length >= 2
        ? `2개월 이상 반복되고 있습니다. 월말 배포로 인한 단순 이월이 아니라 생산 능력(인력·설비)이 배포 속도를 못 따라가는 병목일 수 있습니다. 생산부 인력 운영과 설비 가동 상황을 점검하세요.`
        : `월말에 배포된 물량이 다음 달로 이월된 것이면 정상입니다. 다음 달에 생산이 배포를 초과하는지(밀린 물량 해소) 확인하세요.`,
    })
  }

  if (highRows.length > 0) {
    items.push({
      tone: 'good',
      title: `밀린 도면까지 생산한 달: ${highRows.map((item) => item.row.label).join('·')}`,
      facts: highRows.map((item) => ({
        label: item.row.label,
        value: `배포 대비 ${item.conversion}% 생산`,
      })),
      detail: `이전 달에 배포돼 밀려 있던 물량까지 소화한 달입니다. 생산이 배포를 따라잡고 있다는 좋은 신호입니다.`,
    })
  }

  if (items.length === 0) {
    items.push({
      tone: 'good',
      title: `배포 → 생산 흐름 정상`,
      facts: [],
      detail: `전 기간 배포된 물량을 그 달 안에 대부분 소화했습니다. 배포량과 생산량이 균형을 이루고 있습니다.`,
    })
  }

  return { heading: '공정 흐름 (배포 → 생산)', items }
}

// 자재 그룹: 입고/사용 수지
const buildMaterialGroup = (metrics) => {
  const items = []
  const monthCount = metrics.length

  const deficitMonths = metrics.filter((month) => month.receivedTon < month.usedTon)
  const totalReceived = metrics.reduce((sum, month) => sum + toNumber(month.receivedTon), 0)
  const totalUsed = metrics.reduce((sum, month) => sum + toNumber(month.usedTon), 0)

  if (deficitMonths.length > 0) {
    items.push({
      tone: deficitMonths.length >= 3 ? 'bad' : 'warn',
      title: `입고가 사용보다 적은 달: ${monthCount}개월 중 ${deficitMonths.length}개월`,
      facts: deficitMonths.map((month) => ({
        label: month.label,
        value: `${formatTonValue(month.usedTon - month.receivedTon)} 부족`,
      })),
      detail: deficitMonths.length >= 3
        ? `절반 가까이 잔고를 깎아 생산했습니다. 사용량 대비 발주량이 구조적으로 부족한 상태라, 월 사용량 기준으로 발주 기준량을 다시 잡아야 합니다.`
        : `해당 달은 입고보다 사용이 많아 잔고에서 꺼내 쓴 것입니다. 일시적이면 문제없지만, 반복되면 발주 주기를 앞당겨야 합니다.`,
    })
  }

  const balanceChange = totalReceived - totalUsed
  items.push({
    tone: balanceChange >= 0 ? 'good' : 'warn',
    title: balanceChange >= 0
      ? `${monthCount}개월 합계: 잔고 ${formatTonValue(balanceChange)} 증가`
      : `${monthCount}개월 합계: 잔고 ${formatTonValue(-balanceChange)} 감소`,
    facts: [
      { label: '입고', value: formatTonValue(totalReceived) },
      { label: '사용', value: formatTonValue(totalUsed) },
      { label: '월평균 사용', value: formatTonValue(totalUsed / monthCount) },
    ],
    detail: balanceChange >= 0
      ? `기간 전체로 입고가 사용을 웃돌아 잔고가 쌓이는 구조입니다. 월평균 사용량을 기준으로 현재 총 잔고가 몇 개월치인지 계산해 두면 발주 판단이 빨라집니다.`
      : `기간 전체로 사용이 입고를 초과해 잔고가 줄고 있습니다. 현재 총 잔고를 월평균 사용량(${formatTonValue(totalUsed / monthCount)})으로 나누면 몇 개월 버틸 수 있는지 나옵니다. 그 시점 전에 발주가 도착하도록 계획해야 합니다.`,
  })

  return { heading: '자재 (입고 · 사용)', items }
}

// 다음 달 전망 그룹
const buildOutlookGroup = (metrics, valueChain) => {
  const items = []
  if (metrics.length < 2) return { heading: '다음 달 전망', items }

  const previous = metrics[metrics.length - 2]
  const latest = metrics[metrics.length - 1]
  const drawingRate = changeRate(drawingWorkQty(previous), drawingWorkQty(latest))
  const drawingDirection = describeDirection(drawingRate)

  if (drawingDirection === 'up') {
    items.push({
      tone: 'good',
      title: `${latest.label} 도면배포 증가 (${formatChangeRate(drawingRate)}) → 다음 달 생산·매출 증가 여지`,
      facts: [
        { label: previous.label, value: formatWorkBreakdown(previous.drawingTotalHeadQty, previous.drawingInchQty) },
        { label: latest.label, value: formatWorkBreakdown(latest.drawingTotalHeadQty, latest.drawingInchQty) },
      ],
      detail: `도면배포는 보통 한 달 뒤 생산·매출로 이어지는 선행 지표입니다. 배포가 늘어난 만큼 다음 달 생산 물량이 확보돼 있으니, 자재 입고와 생산 인력이 이를 소화할 수 있는지 미리 확인하면 매출로 연결됩니다.`,
    })
  } else if (drawingDirection === 'down') {
    items.push({
      tone: 'warn',
      title: `${latest.label} 도면배포 감소 (${formatChangeRate(drawingRate)}) → 다음 달 생산·매출 위험`,
      facts: [
        { label: previous.label, value: formatWorkBreakdown(previous.drawingTotalHeadQty, previous.drawingInchQty) },
        { label: latest.label, value: formatWorkBreakdown(latest.drawingTotalHeadQty, latest.drawingInchQty) },
      ],
      detail: `배포가 줄면 한 달 뒤 생산할 물량 자체가 없습니다. 설계 처리 속도 문제인지, 그 앞의 수주량 자체가 준 것인지 구분해야 합니다. 수주가 준 것이라면 영업 단계부터 대응이 필요합니다.`,
    })
  } else if (drawingRate !== null) {
    items.push({
      tone: 'info',
      title: `${latest.label} 도면배포 ${directionText(drawingRate)} → 다음 달 물량 안정`,
      facts: [
        { label: previous.label, value: formatWorkBreakdown(previous.drawingTotalHeadQty, previous.drawingInchQty) },
        { label: latest.label, value: formatWorkBreakdown(latest.drawingTotalHeadQty, latest.drawingInchQty) },
      ],
      detail: `배포량이 유지되고 있어 다음 달 생산 물량은 이번 달과 비슷한 수준으로 예상됩니다.`,
    })
  }

  const latestChainRow = valueChain?.rows?.find((row) => row.key === latest.key) ?? null
  if (latestChainRow && latestChainRow.salesVsProduction !== null && latestChainRow.salesVsProduction < 85) {
    const carryOver = latestChainRow.productionValue - latestChainRow.salesAmountHead
    items.push({
      tone: 'info',
      title: `다음 달로 넘어간 매출 약 ${formatBillionValue(carryOver)} 예상`,
      facts: [],
      detail: `${latest.label}에 생산했지만 아직 매출로 잡히지 않은 물량의 추정 금액(헤드당 ${formatWonValue(HEAD_UNIT_PRICE)} 기준)입니다. 출하·청구가 정상 진행되면 다음 달 매출에 이 금액이 더해집니다. 다음 달 매출을 평가할 때 이 이월분을 감안하세요.`,
    })
  }

  return { heading: '다음 달 전망', items }
}

// 결론: 분기 성과 한 줄 평가 + 핵심 원인 + 해야 할 일
// isCurrentQuarter=false(과거 분기 조회)면 현재 시점 스냅샷(미출하·수주예정)은 제외한다.
export const buildConclusion = (
  metrics,
  valueChain,
  expectedOrders,
  simulation,
  unshippedBacklog = null,
  isCurrentQuarter = true,
  target = MONTHLY_SALES_TARGET,
) => {
  const monthCount = metrics.length
  if (monthCount === 0) return null

  const totalSales = metrics.reduce((sum, month) => sum + toNumber(month.salesAmount), 0)
  const totalTarget = target * monthCount
  const rate = totalTarget > 0 ? Math.round((totalSales / totalTarget) * 100) : 0
  const gap = totalTarget - totalSales

  const tone = rate >= 100 ? 'good' : rate >= 85 ? 'warn' : 'bad'
  const headline = rate >= 100
    ? `매출 ${formatBillionValue(totalSales)}으로 목표(${formatBillionValue(totalTarget)})를 달성했습니다 (${rate}%).`
    : `매출 ${formatBillionValue(totalSales)}으로 목표(${formatBillionValue(totalTarget)})에 ${formatBillionValue(gap)} 못 미쳤습니다 (${rate}%).`

  // 핵심 원인 후보를 우선순위대로 수집
  const causes = []

  const latest = metrics[monthCount - 1]
  const latestChainRow = valueChain?.rows?.find((row) => row.key === latest.key) ?? null
  const carryOver = latestChainRow?.salesVsProduction !== null
    && latestChainRow?.salesVsProduction !== undefined
    && latestChainRow.salesVsProduction < 85
    ? latestChainRow.productionValue - latestChainRow.salesAmountHead
    : 0

  const unshippedWorkQty = unshippedBacklog
    ? toNumber(unshippedBacklog.headQty) + toNumber(unshippedBacklog.inchQty) * INCH_TO_HEAD_RATIO
    : 0
  const unshippedValue = unshippedWorkQty * HEAD_UNIT_PRICE

  // 미출하와 최근 월 미청구 이월은 같은 물량이 겹치므로 하나의 원인으로 합쳐 설명한다.
  if (isCurrentQuarter && unshippedValue >= 100000000) {
    causes.push(
      `미출하 물량 ${formatWorkBreakdown(unshippedBacklog.totalHeadQty, unshippedBacklog.inchQty)} ≈ ${formatBillionValue(unshippedValue)}이 매출로 잡히지 않고 있습니다 (용접 등 잔여 공정 대기 포함).${
        carryOver >= 100000000 ? ` ${latest.label} 생산분 미청구 약 ${formatBillionValue(carryOver)}도 대부분 이 물량입니다.` : ''
      }`,
    )
  } else if (carryOver >= 100000000) {
    causes.push(`${latest.label}에 생산하고도 청구되지 않은 약 ${formatBillionValue(carryOver)}이 다음 달로 이월됐습니다.`)
  }

  const totalOrderHead = metrics.reduce((sum, month) => sum + toNumber(month.orderHeadQty), 0)
  const totalOrderNoHead = metrics.reduce((sum, month) => sum + toNumber(month.orderNoHeadCount), 0)
  const totalProductionHead = metrics.reduce((sum, month) => sum + toNumber(month.productionTotalHeadQty), 0)
  const orderCoverage = totalProductionHead > 0 ? Math.round((totalOrderHead / totalProductionHead) * 100) : null
  if (orderCoverage !== null && orderCoverage < 100) {
    causes.push(
      `신규 수주(${formatHeadValue(totalOrderHead)})가 생산량(${formatHeadValue(totalProductionHead)})의 ${orderCoverage}%에 그쳐 일감이 줄고 있습니다.${
        totalOrderNoHead > 0 ? ` 단, 헤드수 미입력 수주 ${totalOrderNoHead}건이 빠진 수치라 실제는 이보다 높을 수 있습니다.` : ''
      }`,
    )
  }

  if (monthCount >= 2) {
    const previous = metrics[monthCount - 2]
    const drawingRate = changeRate(drawingWorkQty(previous), drawingWorkQty(latest))
    if (describeDirection(drawingRate) === 'down') {
      causes.push(`${latest.label} 도면배포가 ${formatChangeRate(drawingRate)} 줄어 다음 달 생산 물량이 부족해질 수 있습니다.`)
    }
  }

  const deficitMonths = metrics.filter((month) => month.receivedTon < month.usedTon)
  if (deficitMonths.length >= 2) {
    causes.push(`${monthCount}개월 중 ${deficitMonths.length}개월은 자재 입고가 사용보다 적어 잔고를 깎아 생산했습니다.`)
  }

  if (causes.length === 0) {
    causes.push(rate >= 100
      ? `수주 → 도면배포 → 생산 → 매출의 흐름이 균형을 이루고 있습니다.`
      : `공정 흐름에 뚜렷한 병목은 없어, 물량 자체(수주 규모)가 목표 대비 부족한 것이 원인입니다.`)
  }

  // 해야 할 일
  const actions = []
  if (isCurrentQuarter && unshippedValue >= 100000000) {
    actions.push(`미출하 물량 ≈ ${formatBillionValue(unshippedValue)}이 매출 전환 대기 중입니다. 용접 등 잔여 공정 대기인지 출하 지연인지 구분해 해소하면 그만큼 매출로 잡힙니다.`)
  }
  if (simulation) {
    const productionText = formatHeadValue(simulation.requiredProductionHead)
    const drawingText = formatHeadValue(simulation.requiredDrawingHead)
    actions.push(productionText === drawingText
      ? `목표 달성 기준: 월 수주·도면배포·생산 모두 ${productionText} 수준을 유지해야 합니다.`
      : `목표 달성 기준: 월 수주·생산 ${productionText}, 도면배포 ${drawingText}를 유지해야 합니다.`)
  }
  if (isCurrentQuarter) {
    if (expectedOrders && expectedOrders.totalHeadQty > 0) {
      const avgMonthlyProduction = monthCount > 0 ? totalProductionHead / monthCount : 0
      const monthsOfWork = avgMonthlyProduction > 0 ? expectedOrders.totalHeadQty / avgMonthlyProduction : null
      actions.push(monthsOfWork !== null
        ? `수주 예정 ${formatHeadValue(expectedOrders.totalHeadQty)}(약 ${monthsOfWork.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}개월치 일감)을 조기에 확정하는 것이 최우선입니다.`
        : `수주 예정 ${formatHeadValue(expectedOrders.totalHeadQty)}을 조기에 확정하는 것이 최우선입니다.`)
    } else {
      actions.push(`등록된 수주 예정이 없어 신규 수주 확보가 최우선입니다.`)
    }
  }

  return {
    tone,
    headline,
    causes: causes.slice(0, 3),
    actions: actions.slice(0, 3),
  }
}

export const buildDetailedAnalysis = (
  metrics,
  valueChain,
  expectedOrders = null,
  unshippedBacklog = null,
  target = MONTHLY_SALES_TARGET,
) => {
  if (metrics.length < 2) return []

  return [
    buildTargetGroup(metrics, target),
    buildOrderGroup(metrics, expectedOrders),
    buildFlowGroup(metrics),
    buildWorkValueGroup(valueChain),
    buildUnshippedGroup(unshippedBacklog, metrics),
    buildBottleneckGroup(valueChain),
    buildMaterialGroup(metrics),
    buildOutlookGroup(metrics, valueChain),
  ].filter((group) => group.items.length > 0)
}

export const buildTargetSimulation = (metrics, target = MONTHLY_SALES_TARGET) => {
  const totalSales = metrics.reduce((sum, month) => sum + toNumber(month.salesAmount), 0)
  const totalHeadSales = metrics.reduce((sum, month) => sum + toNumber(month.salesAmountHead), 0)
  const totalProductionWork = metrics.reduce((sum, month) => sum + productionWorkQty(month), 0)
  const totalDrawingWork = metrics.reduce((sum, month) => sum + drawingWorkQty(month), 0)
  const totalUsedTon = metrics.reduce((sum, month) => sum + toNumber(month.usedTon), 0)

  if (totalSales <= 0 || totalProductionWork <= 0) return null

  // 목표 매출 중 헤드 매출이 차지하는 비중(과거 실적 기준)만큼을 작업량(헤드 환산)으로 바꾼다.
  const headShare = totalHeadSales > 0 ? Math.min(totalHeadSales / totalSales, 1) : 1
  const requiredProductionHead = Math.ceil((target * headShare) / HEAD_UNIT_PRICE)
  const drawingRatio = totalDrawingWork > 0 ? totalDrawingWork / totalProductionWork : 1
  const requiredDrawingHead = Math.ceil(requiredProductionHead * Math.max(drawingRatio, 1))
  const usedTonPerHead = totalUsedTon / totalProductionWork
  const requiredUsedTon = Math.ceil(requiredProductionHead * usedTonPerHead)

  return {
    baseMonthLabels: metrics.length > 0 ? `${metrics[0].label}~${metrics[metrics.length - 1].label}` : '',
    salesPerHead: HEAD_UNIT_PRICE,
    headShare,
    requiredOrderHead: requiredProductionHead,
    requiredProductionHead,
    requiredWeeklyProductionHead: Math.ceil(requiredProductionHead / WEEKS_PER_MONTH),
    requiredDrawingHead,
    requiredWeeklyDrawingHead: Math.ceil(requiredDrawingHead / WEEKS_PER_MONTH),
    requiredUsedTon,
    requiredReceivedTon: requiredUsedTon,
  }
}
