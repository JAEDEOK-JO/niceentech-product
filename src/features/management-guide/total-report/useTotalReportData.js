import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'

const PRODUCT_LIST_TABLE = 'product_list'
const SALES_WEEKLY_TABLE = 'sales_weekly_entries'
const METRIC_ENTRIES_TABLE = 'department_metric_entries'
const COMPANY_LIST_TABLE = 'company_list'
const OPERATIONS_DEPARTMENT_CODE = 'operations'
const INVENTORY_PERIOD_TYPE = 'weekly'
const LEGACY_INVENTORY_PERIOD_TYPE = 'monthly'
// 영업부 보고서와 동일한 수주 집계 시작 기준
const ORDER_BASELINE_START = '2026-01-01'
const METRIC_KEYS = {
  received: 'monthly_received_ton',
  used: 'monthly_used_ton',
  balance: 'monthly_balance_ton',
}

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
const normalizeText = (value) => String(value ?? '').trim()

const isCompletedStatus = (value) => {
  const text = normalizeText(value)
  return text.includes('작업완료') || text.includes('출하완료')
}
const isProductionCompleted = (row) =>
  Boolean(row?.complete) ||
  Boolean(row?.shipment) ||
  isCompletedStatus(row?.worker_t) ||
  isCompletedStatus(row?.worker_nasa) ||
  isCompletedStatus(row?.worker_main) ||
  isCompletedStatus(row?.worker_welding)

const hasShippedStatus = (value) => normalizeText(value).includes('출하완료')
const isShipped = (row) =>
  Boolean(row?.shipment) ||
  hasShippedStatus(row?.worker_t) ||
  hasShippedStatus(row?.worker_nasa) ||
  hasShippedStatus(row?.worker_main) ||
  hasShippedStatus(row?.worker_welding)

// 작업은 끝났지만 출하되지 않아 매출로 못 잡힌 물량 (보류 제외)
const isUnshippedCompleted = (row) =>
  !Boolean(row?.hold) && isProductionCompleted(row) && !isShipped(row)

const parseFlexibleDate = (value, fallbackYear = new Date().getFullYear()) => {
  const raw = normalizeText(value)
  if (!raw) return null

  const koreanFull = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (koreanFull) {
    const [, year, month, day] = koreanFull
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const monthDay = raw.match(/(\d{1,2})\D+(\d{1,2})/)
  if (monthDay && !raw.includes(':')) {
    const [, month, day] = monthDay
    const parsed = new Date(fallbackYear, Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const native = new Date(raw)
  return Number.isNaN(native.getTime()) ? null : native
}

const buildMonthDescriptor = (year, monthIndex) => {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return {
    key: monthKey,
    label: `${monthIndex + 1}월`,
    year,
    monthIndex,
    monthValue: `${monthKey}-01`,
    monthEndValue: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
  }
}

// 분기(1~4)에 속한 3개월 목록
export const buildQuarterMonths = (year, quarter) => {
  const startMonthIndex = (quarter - 1) * 3
  return Array.from({ length: 3 }, (_, i) => buildMonthDescriptor(year, startMonthIndex + i))
}

// 마지막으로 완료된 달이 속한 분기 = 조회 가능한 최신 분기
export const getLatestReportQuarter = (now = new Date()) => {
  const lastCompleted = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return {
    year: lastCompleted.getFullYear(),
    quarter: Math.floor(lastCompleted.getMonth() / 3) + 1,
  }
}

const isCompletedMonth = (month, now = new Date()) =>
  month.year < now.getFullYear() ||
  (month.year === now.getFullYear() && month.monthIndex < now.getMonth())

// 전월 대비 증감용: 당월 1일 ~ 오늘까지 부분 집계
export const buildCurrentMonthToDate = (now = new Date()) => {
  const y = now.getFullYear()
  const m = now.getMonth()
  const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`
  const today = now.getDate()
  return {
    key: `${monthKey}-partial`,
    label: `${m + 1}월`,
    comparisonLabel: `${m + 1}월 현재까지`,
    year: y,
    monthIndex: m,
    monthValue: `${monthKey}-01`,
    monthEndValue: `${monthKey}-${String(today).padStart(2, '0')}`,
    isPartial: true,
  }
}

const PRODUCT_COLUMNS_WITH_INCH =
  'id,work_type,head,inch,test_date,drawing_date,complete,shipment,hold,worker_t,worker_main,worker_nasa,worker_welding'
const PRODUCT_COLUMNS_LEGACY =
  'id,work_type,head,test_date,drawing_date,complete,shipment,hold,worker_t,worker_main,worker_nasa,worker_welding'

const fetchAllProductRows = async () => {
  const batchSize = 1000
  let from = 0
  let hasMore = true
  let columns = PRODUCT_COLUMNS_WITH_INCH
  const allRows = []

  while (hasMore) {
    let { data, error } = await supabase
      .from(PRODUCT_LIST_TABLE)
      .select(columns)
      .order('id', { ascending: false })
      .range(from, from + batchSize - 1)

    // inch 컬럼이 아직 없는 DB 대응
    if (error && String(error.message ?? '').includes('inch')) {
      columns = PRODUCT_COLUMNS_LEGACY
      ;({ data, error } = await supabase
        .from(PRODUCT_LIST_TABLE)
        .select(columns)
        .order('id', { ascending: false })
        .range(from, from + batchSize - 1))
    }

    if (error) throw new Error(error.message ?? '생산 데이터를 불러오지 못했습니다.')
    const nextRows = data ?? []
    allRows.push(...nextRows)
    hasMore = nextRows.length === batchSize
    from += batchSize
  }

  return allRows
}

const fetchSalesByMonths = async (months) => {
  const { data, error } = await supabase
    .from(SALES_WEEKLY_TABLE)
    .select('target_month,week_index,sales_amount_head,sales_amount_screw,sales_amount_supipe')
    .in('target_month', months.map((month) => month.monthValue))

  if (error) throw new Error(error.message ?? '영업부 매출 데이터를 불러오지 못했습니다.')
  return data ?? []
}

const fetchCompanyOrderRows = async () => {
  const { data, error } = await supabase
    .from(COMPANY_LIST_TABLE)
    .select('id,registration_month,order_confirmed,total_head_count')
    .not('registration_month', 'is', null)

  if (error) throw new Error(error.message ?? '영업부 수주 데이터를 불러오지 못했습니다.')
  return data ?? []
}

const fetchInventoryEntries = async (months) => {
  const firstMonthValue = months[0].monthValue
  const lastMonthEndValue = months[months.length - 1].monthEndValue

  const [weeklyResult, legacyResult] = await Promise.all([
    supabase
      .from(METRIC_ENTRIES_TABLE)
      .select('metric_key,numeric_value,period_start_date')
      .eq('department_code', OPERATIONS_DEPARTMENT_CODE)
      .eq('period_type', INVENTORY_PERIOD_TYPE)
      .gte('period_start_date', firstMonthValue)
      .lte('period_start_date', lastMonthEndValue)
      .in('metric_key', [METRIC_KEYS.received, METRIC_KEYS.used]),
    supabase
      .from(METRIC_ENTRIES_TABLE)
      .select('metric_key,numeric_value,period_start_date')
      .eq('department_code', OPERATIONS_DEPARTMENT_CODE)
      .eq('period_type', LEGACY_INVENTORY_PERIOD_TYPE)
      .in('period_start_date', months.map((month) => month.monthValue))
      .in('metric_key', [METRIC_KEYS.received, METRIC_KEYS.used]),
  ])

  if (weeklyResult.error) throw new Error(weeklyResult.error.message ?? '공무부 데이터를 불러오지 못했습니다.')
  if (legacyResult.error) throw new Error(legacyResult.error.message ?? '공무부 데이터를 불러오지 못했습니다.')

  return { weeklyRows: weeklyResult.data ?? [], legacyRows: legacyResult.data ?? [] }
}

const fetchTotalBalance = async () => {
  const { data, error } = await supabase
    .from(METRIC_ENTRIES_TABLE)
    .select('numeric_value')
    .eq('department_code', OPERATIONS_DEPARTMENT_CODE)
    .eq('metric_key', METRIC_KEYS.balance)
    .in('period_type', [INVENTORY_PERIOD_TYPE, LEGACY_INVENTORY_PERIOD_TYPE])

  if (error) throw new Error(error.message ?? '공무부 잔고 데이터를 불러오지 못했습니다.')
  return (data ?? []).reduce((sum, row) => sum + toNumber(row?.numeric_value), 0)
}

const sumSalesForMonth = (salesRows, month) =>
  salesRows
    .filter((row) => normalizeText(row?.target_month) === month.monthValue)
    .reduce(
      (accumulator, row) => {
        const headAmount = toNumber(row?.sales_amount_head)
        accumulator.total += headAmount + toNumber(row?.sales_amount_screw) + toNumber(row?.sales_amount_supipe)
        accumulator.head += headAmount
        return accumulator
      },
      { total: 0, head: 0 },
    )

const sumInventoryForMonth = ({ weeklyRows, legacyRows }, month) => {
  const monthWeeklyRows = weeklyRows.filter((row) => {
    const startDate = normalizeText(row?.period_start_date)
    return startDate >= month.monthValue && startDate <= month.monthEndValue
  })
  const targetRows = monthWeeklyRows.length > 0
    ? monthWeeklyRows
    : legacyRows.filter((row) => normalizeText(row?.period_start_date) === month.monthValue)

  return targetRows.reduce(
    (accumulator, row) => {
      const metricKey = normalizeText(row?.metric_key)
      if (metricKey === METRIC_KEYS.received) accumulator.received += toNumber(row?.numeric_value)
      if (metricKey === METRIC_KEYS.used) accumulator.used += toNumber(row?.numeric_value)
      return accumulator
    },
    { received: 0, used: 0 },
  )
}

const isRowInMonth = (date, month) => {
  if (!date) return false
  if (date.getFullYear() !== month.year || date.getMonth() !== month.monthIndex) return false
  if (month.isPartial) {
    const end = new Date(month.monthEndValue)
    if (Number.isNaN(end.getTime())) return true
    return date.getTime() <= end.getTime() + 86400000 - 1
  }
  return true
}

// 인치가 기록된 현장은 헤드 대신 인치로 작업량을 적은 것이므로,
// 작업량 계산에서는 해당 행의 헤드를 제외해 이중 계산을 막는다.
// totalHeadQty는 인치와 무관하게 실제 헤드 수 전체 합계(표시용)다.
const sumWorkQuantities = (rows) =>
  rows.reduce(
    (accumulator, row) => {
      const inch = toNumber(row?.inch)
      const head = toNumber(row?.head)
      accumulator.totalHeadQty += head
      if (inch > 0) accumulator.inchQty += inch
      else accumulator.headQty += head
      return accumulator
    },
    { headQty: 0, inchQty: 0, totalHeadQty: 0 },
  )

const sumProductionForMonth = (productRows, month) =>
  sumWorkQuantities(
    productRows.filter(
      (row) => isProductionCompleted(row) && isRowInMonth(parseFlexibleDate(row?.test_date), month),
    ),
  )

// 현재 시점 스냅샷: 작업완료 후 미출하 물량 전체
const buildUnshippedBacklog = (productRows) => {
  const targetRows = productRows.filter((row) => isUnshippedCompleted(row))
  return {
    ...sumWorkQuantities(targetRows),
    count: targetRows.length,
  }
}

const sumDrawingForMonth = (productRows, month) => {
  const targetRows = productRows.filter((row) => {
    if (!row?.drawing_date) return false
    const drawingDate = new Date(row.drawing_date)
    if (Number.isNaN(drawingDate.getTime())) return false
    return isRowInMonth(drawingDate, month)
  })
  return {
    ...sumWorkQuantities(targetRows),
    count: targetRows.length,
  }
}

// 확정 수주: 해당 월에 등록된 order_confirmed 물량 (헤드 기준)
// 헤드수 미입력 건은 0으로 합산되므로 건수를 따로 집계해 과소평가를 표시한다.
const sumOrdersForMonth = (orderRows, month) => {
  const targetRows = orderRows.filter(
    (row) => Boolean(row?.order_confirmed) && normalizeText(row?.registration_month).slice(0, 7) === month.key,
  )
  return {
    headQty: targetRows.reduce((sum, row) => sum + toNumber(row?.total_head_count), 0),
    noHeadCount: targetRows.filter((row) => toNumber(row?.total_head_count) <= 0).length,
  }
}

// 수주 예정: 아직 미확정인 물량 전체 (등록월 = 예정 시점)
const buildExpectedOrders = (orderRows, now = new Date()) => {
  const rows = orderRows.filter(
    (row) => !row?.order_confirmed && normalizeText(row?.registration_month) >= ORDER_BASELINE_START,
  )

  const byMonthMap = new Map()
  for (const row of rows) {
    const key = normalizeText(row.registration_month).slice(0, 7)
    const entry = byMonthMap.get(key) ?? { key, headQty: 0, count: 0 }
    entry.headQty += toNumber(row.total_head_count)
    entry.count += 1
    byMonthMap.set(key, entry)
  }

  const byMonth = [...byMonthMap.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => {
      const [year, month] = entry.key.split('-')
      const label = Number(year) === now.getFullYear() ? `${Number(month)}월` : `${year}년 ${Number(month)}월`
      return { ...entry, label }
    })

  return {
    totalHeadQty: rows.reduce((sum, row) => sum + toNumber(row.total_head_count), 0),
    count: rows.length,
    byMonth,
  }
}

const buildMonthMetrics = (month, productRows, salesRows, inventoryEntries, orderRows) => {
  const inventory = sumInventoryForMonth(inventoryEntries, month)
  const drawing = sumDrawingForMonth(productRows, month)
  const production = sumProductionForMonth(productRows, month)
  const sales = sumSalesForMonth(salesRows, month)
  const orders = sumOrdersForMonth(orderRows, month)
  return {
    ...month,
    salesAmount: sales.total,
    salesAmountHead: sales.head,
    orderHeadQty: orders.headQty,
    orderNoHeadCount: orders.noHeadCount,
    drawingHeadQty: drawing.headQty,
    drawingInchQty: drawing.inchQty,
    drawingTotalHeadQty: drawing.totalHeadQty,
    drawingCount: drawing.count,
    receivedTon: inventory.received,
    usedTon: inventory.used,
    productionHeadQty: production.headQty,
    productionInchQty: production.inchQty,
    productionTotalHeadQty: production.totalHeadQty,
  }
}

export const useTotalReportData = () => {
  const loading = ref(false)
  const errorMessage = ref('')
  const latestQuarter = getLatestReportQuarter()
  const selectedQuarter = ref({ ...latestQuarter })
  const months = ref([])
  const monthlyMetrics = ref([])
  const currentMonthMetrics = ref(null)
  const expectedOrders = ref(null)
  const unshippedBacklog = ref(null)
  const totalBalanceTon = ref(0)

  const quarterIndexOf = ({ year, quarter }) => year * 4 + (quarter - 1)
  const isLatestQuarter = computed(() => quarterIndexOf(selectedQuarter.value) >= quarterIndexOf(latestQuarter))
  const canGoNextQuarter = computed(() => quarterIndexOf(selectedQuarter.value) < quarterIndexOf(latestQuarter))
  const quarterLabel = computed(() => `${selectedQuarter.value.year}년 ${selectedQuarter.value.quarter}분기`)

  const fetchTotalReportData = async () => {
    loading.value = true
    errorMessage.value = ''

    try {
      const { year, quarter } = selectedQuarter.value
      const quarterMonths = buildQuarterMonths(year, quarter)
      const targetMonths = quarterMonths.filter((month) => isCompletedMonth(month))
      months.value = targetMonths

      const currentMonth = isLatestQuarter.value ? buildCurrentMonthToDate() : null

      if (targetMonths.length === 0) {
        monthlyMetrics.value = []
        currentMonthMetrics.value = null
        expectedOrders.value = null
        unshippedBacklog.value = null
        totalBalanceTon.value = 0
        return
      }

      const salesFetchMonths = currentMonth ? [...targetMonths, currentMonth] : targetMonths
      const inventoryFetchMonths = currentMonth
        ? [{ ...targetMonths[0] }, { ...currentMonth }]
        : [{ ...targetMonths[0] }, { ...targetMonths[targetMonths.length - 1] }]

      const [productRows, salesRows, inventoryEntries, balanceTon, orderRows] = await Promise.all([
        fetchAllProductRows(),
        fetchSalesByMonths(salesFetchMonths),
        fetchInventoryEntries(inventoryFetchMonths),
        fetchTotalBalance(),
        fetchCompanyOrderRows(),
      ])

      totalBalanceTon.value = balanceTon
      expectedOrders.value = buildExpectedOrders(orderRows)
      unshippedBacklog.value = buildUnshippedBacklog(productRows)
      monthlyMetrics.value = targetMonths.map((month) =>
        buildMonthMetrics(month, productRows, salesRows, inventoryEntries, orderRows),
      )
      currentMonthMetrics.value = currentMonth
        ? buildMonthMetrics(currentMonth, productRows, salesRows, inventoryEntries, orderRows)
        : null
    } catch (error) {
      errorMessage.value = error?.message ?? '총보고서 데이터를 불러오지 못했습니다.'
      monthlyMetrics.value = []
      currentMonthMetrics.value = null
      expectedOrders.value = null
      unshippedBacklog.value = null
      totalBalanceTon.value = 0
    } finally {
      loading.value = false
    }
  }

  const moveQuarter = async (delta) => {
    if (loading.value) return
    const { year, quarter } = selectedQuarter.value
    const nextIndex = quarterIndexOf({ year, quarter }) + delta
    if (nextIndex > quarterIndexOf(latestQuarter)) return

    selectedQuarter.value = {
      year: Math.floor(nextIndex / 4),
      quarter: (nextIndex % 4) + 1,
    }
    await fetchTotalReportData()
  }

  return {
    loading,
    errorMessage,
    months,
    monthlyMetrics,
    currentMonthMetrics,
    expectedOrders,
    unshippedBacklog,
    totalBalanceTon,
    quarterLabel,
    isLatestQuarter,
    canGoNextQuarter,
    moveQuarter,
    fetchTotalReportData,
  }
}
