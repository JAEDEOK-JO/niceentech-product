export const MONTHLY_SALES_TARGET = 600000000
const WEEKS_PER_MONTH = 4.33
const CHANGE_THRESHOLD = 5
// 상세 흐름 분석은 최근 구간만 다뤄 카드 수를 제한한다.
const FLOW_DETAIL_COUNT = 3

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const formatBillionValue = (value) => {
  const amount = toNumber(value)
  return `${(amount / 100000000).toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}억`
}

const changeRate = (previous, current) => {
  if (!previous) return null
  return ((current - previous) / previous) * 100
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
          sales: changeRate(previous.salesAmount, month.salesAmount),
          drawing: changeRate(previous.drawingHeadQty, month.drawingHeadQty),
          received: changeRate(previous.receivedTon, month.receivedTon),
          production: changeRate(previous.productionHeadQty, month.productionHeadQty),
        }
      }),
    )
  }

  if (partialCurrentMonth && metrics.length > 0) {
    const previous = metrics[metrics.length - 1]
    comparisons.push({
      key: partialCurrentMonth.key,
      label: `${previous.label} → ${partialCurrentMonth.comparisonLabel ?? `${partialCurrentMonth.label} 현재까지`}`,
      sales: changeRate(previous.salesAmount, partialCurrentMonth.salesAmount),
      drawing: changeRate(previous.drawingHeadQty, partialCurrentMonth.drawingHeadQty),
      received: changeRate(previous.receivedTon, partialCurrentMonth.receivedTon),
      production: changeRate(previous.productionHeadQty, partialCurrentMonth.productionHeadQty),
      isPartial: true,
    })
  }

  return comparisons
}

// 기간 평균 헤드당 매출 단가로 "그 달에 한 일의 매출 가치"를 환산한다.
export const buildValueChain = (metrics) => {
  const totalSales = metrics.reduce((sum, month) => sum + toNumber(month.salesAmount), 0)
  const totalProductionHead = metrics.reduce((sum, month) => sum + toNumber(month.productionHeadQty), 0)
  if (totalSales <= 0 || totalProductionHead <= 0) return null

  const salesPerHead = totalSales / totalProductionHead

  const rows = metrics.map((month) => {
    const productionValue = toNumber(month.productionHeadQty) * salesPerHead
    const drawingValue = toNumber(month.drawingHeadQty) * salesPerHead
    const salesVsProduction = productionValue > 0 ? (toNumber(month.salesAmount) / productionValue) * 100 : null
    const productionVsDrawing =
      toNumber(month.drawingHeadQty) > 0 ? (toNumber(month.productionHeadQty) / toNumber(month.drawingHeadQty)) * 100 : null

    return {
      key: month.key,
      label: month.label,
      salesAmount: toNumber(month.salesAmount),
      drawingHeadQty: toNumber(month.drawingHeadQty),
      productionHeadQty: toNumber(month.productionHeadQty),
      drawingValue,
      productionValue,
      salesVsProduction,
      productionVsDrawing,
    }
  })

  return { salesPerHead, rows }
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

// 월별 흐름 그룹: 최근 구간의 매출 변화를 상류 공정과 연결해 설명
const buildFlowGroup = (metrics) => {
  const items = []
  const startIndex = Math.max(1, metrics.length - FLOW_DETAIL_COUNT)

  for (let index = startIndex; index < metrics.length; index += 1) {
    const previous = metrics[index - 1]
    const current = metrics[index]

    const salesRate = changeRate(previous.salesAmount, current.salesAmount)
    const drawingRate = changeRate(previous.drawingHeadQty, current.drawingHeadQty)
    const receivedRate = changeRate(previous.receivedTon, current.receivedTon)
    const productionRate = changeRate(previous.productionHeadQty, current.productionHeadQty)
    const salesDirection = describeDirection(salesRate)

    const facts = [
      { label: '매출', value: `${formatBillionValue(previous.salesAmount)} → ${formatBillionValue(current.salesAmount)}` },
      { label: '도면배포', value: formatChangeRate(drawingRate) },
      { label: '입고', value: formatChangeRate(receivedRate) },
      { label: '생산', value: formatChangeRate(productionRate) },
    ]

    if (salesDirection === 'down') {
      const sameDirection = [
        { name: '도면배포', rate: drawingRate },
        { name: '입고', rate: receivedRate },
        { name: '생산', rate: productionRate },
      ].filter((item) => describeDirection(item.rate) === 'down')

      items.push({
        tone: 'bad',
        title: `${previous.label} → ${current.label}: 매출 ${formatBillionValue(previous.salesAmount - current.salesAmount)} 감소 (${formatChangeRate(salesRate)})`,
        facts,
        detail: sameDirection.length > 0
          ? `${sameDirection.map((item) => item.name).join('·')}이 매출과 함께 줄었습니다. 도면배포와 입고는 생산보다 앞에 있는 공정이라, 여기가 줄면 한두 달 뒤 생산과 매출이 순서대로 줄어듭니다. 원인은 상류 쪽(수주량·설계 처리·자재 발주)에서 찾아야 합니다.`
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

// 일량 대비 매출 그룹: 그 달에 한 일의 돈 가치와 실제 매출 비교
const buildWorkValueGroup = (valueChain) => {
  const items = []
  if (!valueChain) return { heading: '한 일 대비 매출', items }

  items.push({
    tone: 'info',
    title: `기준 단가: 헤드 1개 ≈ ${Math.round(valueChain.salesPerHead).toLocaleString('ko-KR')}원`,
    facts: [],
    detail: `기간 전체 매출 합계를 생산 헤드 합계로 나눈 평균 단가입니다. 이 단가로 "그 달에 생산한 물량이 돈으로 얼마짜리 일이었는지"를 환산해, 실제 매출과 비교합니다. 100%면 한 만큼 매출이 잡힌 것이고, 낮으면 청구가 밀린 것, 높으면 이전 달 물량이 회수된 것입니다.`,
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
    const gap = row.salesAmount - row.productionValue

    const facts = [
      { label: '생산', value: formatHeadValue(row.productionHeadQty) },
      { label: '일의 가치', value: `≈ ${formatBillionValue(row.productionValue)}` },
      { label: '실제 매출', value: formatBillionValue(row.salesAmount) },
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
        value: `배포 ${formatHeadValue(item.row.drawingHeadQty)} 중 ${item.conversion}% 생산`,
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
  const drawingRate = changeRate(previous.drawingHeadQty, latest.drawingHeadQty)
  const drawingDirection = describeDirection(drawingRate)

  if (drawingDirection === 'up') {
    items.push({
      tone: 'good',
      title: `${latest.label} 도면배포 증가 (${formatChangeRate(drawingRate)}) → 다음 달 생산·매출 증가 여지`,
      facts: [
        { label: previous.label, value: formatHeadValue(previous.drawingHeadQty) },
        { label: latest.label, value: formatHeadValue(latest.drawingHeadQty) },
      ],
      detail: `도면배포는 보통 한 달 뒤 생산·매출로 이어지는 선행 지표입니다. 배포가 늘어난 만큼 다음 달 생산 물량이 확보돼 있으니, 자재 입고와 생산 인력이 이를 소화할 수 있는지 미리 확인하면 매출로 연결됩니다.`,
    })
  } else if (drawingDirection === 'down') {
    items.push({
      tone: 'warn',
      title: `${latest.label} 도면배포 감소 (${formatChangeRate(drawingRate)}) → 다음 달 생산·매출 위험`,
      facts: [
        { label: previous.label, value: formatHeadValue(previous.drawingHeadQty) },
        { label: latest.label, value: formatHeadValue(latest.drawingHeadQty) },
      ],
      detail: `배포가 줄면 한 달 뒤 생산할 물량 자체가 없습니다. 설계 처리 속도 문제인지, 그 앞의 수주량 자체가 준 것인지 구분해야 합니다. 수주가 준 것이라면 영업 단계부터 대응이 필요합니다.`,
    })
  } else if (drawingRate !== null) {
    items.push({
      tone: 'info',
      title: `${latest.label} 도면배포 ${directionText(drawingRate)} → 다음 달 물량 안정`,
      facts: [
        { label: previous.label, value: formatHeadValue(previous.drawingHeadQty) },
        { label: latest.label, value: formatHeadValue(latest.drawingHeadQty) },
      ],
      detail: `배포량이 유지되고 있어 다음 달 생산 물량은 이번 달과 비슷한 수준으로 예상됩니다.`,
    })
  }

  const latestChainRow = valueChain?.rows?.find((row) => row.key === latest.key) ?? null
  if (latestChainRow && latestChainRow.salesVsProduction !== null && latestChainRow.salesVsProduction < 85) {
    const carryOver = latestChainRow.productionValue - latestChainRow.salesAmount
    items.push({
      tone: 'info',
      title: `다음 달로 넘어간 매출 약 ${formatBillionValue(carryOver)} 예상`,
      facts: [],
      detail: `${latest.label}에 생산했지만 아직 매출로 잡히지 않은 물량의 추정 금액입니다. 출하·청구가 정상 진행되면 다음 달 매출에 이 금액이 더해집니다. 다음 달 매출을 평가할 때 이 이월분을 감안하세요.`,
    })
  }

  return { heading: '다음 달 전망', items }
}

export const buildDetailedAnalysis = (metrics, valueChain, target = MONTHLY_SALES_TARGET) => {
  if (metrics.length < 2) return []

  return [
    buildTargetGroup(metrics, target),
    buildFlowGroup(metrics),
    buildWorkValueGroup(valueChain),
    buildBottleneckGroup(valueChain),
    buildMaterialGroup(metrics),
    buildOutlookGroup(metrics, valueChain),
  ].filter((group) => group.items.length > 0)
}

export const buildTargetSimulation = (metrics, target = MONTHLY_SALES_TARGET) => {
  const totalSales = metrics.reduce((sum, month) => sum + toNumber(month.salesAmount), 0)
  const totalProductionHead = metrics.reduce((sum, month) => sum + toNumber(month.productionHeadQty), 0)
  const totalDrawingHead = metrics.reduce((sum, month) => sum + toNumber(month.drawingHeadQty), 0)
  const totalUsedTon = metrics.reduce((sum, month) => sum + toNumber(month.usedTon), 0)

  if (totalSales <= 0 || totalProductionHead <= 0) return null

  const salesPerHead = totalSales / totalProductionHead
  const requiredProductionHead = Math.ceil(target / salesPerHead)
  const drawingRatio = totalDrawingHead > 0 ? totalDrawingHead / totalProductionHead : 1
  const requiredDrawingHead = Math.ceil(requiredProductionHead * Math.max(drawingRatio, 1))
  const usedTonPerHead = totalUsedTon / totalProductionHead
  const requiredUsedTon = Math.ceil(requiredProductionHead * usedTonPerHead)

  return {
    baseMonthLabels: metrics.length > 0 ? `${metrics[0].label}~${metrics[metrics.length - 1].label}` : '',
    salesPerHead,
    requiredProductionHead,
    requiredWeeklyProductionHead: Math.ceil(requiredProductionHead / WEEKS_PER_MONTH),
    requiredDrawingHead,
    requiredWeeklyDrawingHead: Math.ceil(requiredDrawingHead / WEEKS_PER_MONTH),
    requiredUsedTon,
    requiredReceivedTon: requiredUsedTon,
  }
}
