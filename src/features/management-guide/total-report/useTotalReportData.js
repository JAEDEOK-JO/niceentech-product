import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const PRODUCT_LIST_TABLE = 'product_list'
const SALES_WEEKLY_TABLE = 'sales_weekly_entries'
const METRIC_ENTRIES_TABLE = 'department_metric_entries'
const OPERATIONS_DEPARTMENT_CODE = 'operations'
const INVENTORY_PERIOD_TYPE = 'weekly'
const LEGACY_INVENTORY_PERIOD_TYPE = 'monthly'
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

// 당월은 진행 중이라 제외하고, 완료된 최근 N개월만 분석 대상으로 사용한다.
export const buildLastCompletedMonths = (count = 3, now = new Date()) => {
  const reportYear = now.getFullYear()
  const reportMonthIndex = now.getMonth()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(reportYear, reportMonthIndex - (count - i), 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`
    const lastDay = new Date(y, m + 1, 0).getDate()
    return {
      key: monthKey,
      label: `${m + 1}월`,
      year: y,
      monthIndex: m,
      monthValue: `${monthKey}-01`,
      monthEndValue: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
    }
  })
}

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

const fetchAllProductRows = async () => {
  const batchSize = 1000
  let from = 0
  let hasMore = true
  const allRows = []

  while (hasMore) {
    const { data, error } = await supabase
      .from(PRODUCT_LIST_TABLE)
      .select('id,work_type,head,test_date,drawing_date,complete,shipment,worker_t,worker_main,worker_nasa,worker_welding')
      .order('id', { ascending: false })
      .range(from, from + batchSize - 1)

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
      (sum, row) =>
        sum + toNumber(row?.sales_amount_head) + toNumber(row?.sales_amount_screw) + toNumber(row?.sales_amount_supipe),
      0,
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

const sumProductionForMonth = (productRows, month) =>
  productRows
    .filter((row) => isProductionCompleted(row) && isRowInMonth(parseFlexibleDate(row?.test_date), month))
    .reduce((sum, row) => sum + toNumber(row?.head), 0)

const sumDrawingForMonth = (productRows, month) => {
  const targetRows = productRows.filter((row) => {
    if (!row?.drawing_date) return false
    const drawingDate = new Date(row.drawing_date)
    if (Number.isNaN(drawingDate.getTime())) return false
    return isRowInMonth(drawingDate, month)
  })
  return {
    headQty: targetRows.reduce((sum, row) => sum + toNumber(row?.head), 0),
    count: targetRows.length,
  }
}

const buildMonthMetrics = (month, productRows, salesRows, inventoryEntries) => {
  const inventory = sumInventoryForMonth(inventoryEntries, month)
  const drawing = sumDrawingForMonth(productRows, month)
  return {
    ...month,
    salesAmount: sumSalesForMonth(salesRows, month),
    drawingHeadQty: drawing.headQty,
    drawingCount: drawing.count,
    receivedTon: inventory.received,
    usedTon: inventory.used,
    productionHeadQty: sumProductionForMonth(productRows, month),
  }
}

export const useTotalReportData = () => {
  const loading = ref(false)
  const errorMessage = ref('')
  const months = ref(buildLastCompletedMonths())
  const monthlyMetrics = ref([])
  const currentMonthMetrics = ref(null)
  const totalBalanceTon = ref(0)

  const fetchTotalReportData = async () => {
    loading.value = true
    errorMessage.value = ''

    try {
      const targetMonths = buildLastCompletedMonths()
      const currentMonth = buildCurrentMonthToDate()
      months.value = targetMonths

      const inventoryFetchMonths = targetMonths.length > 0
        ? [{ ...targetMonths[0] }, { ...currentMonth }]
        : [{ ...currentMonth }]

      const [productRows, salesRows, inventoryEntries, balanceTon] = await Promise.all([
        fetchAllProductRows(),
        fetchSalesByMonths([...targetMonths, currentMonth]),
        fetchInventoryEntries(inventoryFetchMonths),
        fetchTotalBalance(),
      ])

      totalBalanceTon.value = balanceTon
      monthlyMetrics.value = targetMonths.map((month) =>
        buildMonthMetrics(month, productRows, salesRows, inventoryEntries),
      )
      currentMonthMetrics.value = buildMonthMetrics(currentMonth, productRows, salesRows, inventoryEntries)
    } catch (error) {
      errorMessage.value = error?.message ?? '총보고서 데이터를 불러오지 못했습니다.'
      monthlyMetrics.value = []
      currentMonthMetrics.value = null
      totalBalanceTon.value = 0
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    errorMessage,
    months,
    monthlyMetrics,
    currentMonthMetrics,
    totalBalanceTon,
    fetchTotalReportData,
  }
}
