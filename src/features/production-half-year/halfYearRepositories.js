import { supabase } from '@/lib/supabase'

const PRODUCT_LIST_TABLE = 'product_list'
const METRIC_ENTRIES_TABLE = 'department_metric_entries'
const OPERATIONS_DEPARTMENT_CODE = 'operations'
const INVENTORY_PERIOD_TYPE = 'weekly'
const LEGACY_INVENTORY_PERIOD_TYPE = 'monthly'
const METRIC_KEYS = {
  received: 'monthly_received_ton',
  used: 'monthly_used_ton',
}

const PRODUCT_COLUMNS =
  'id,work_type,head,test_date,drawing_date,complete,shipment,hold,worker_t,worker_main,worker_nasa,worker_welding'

export const fetchAllProductRows = async () => {
  const batchSize = 1000
  let from = 0
  let hasMore = true
  const allRows = []

  while (hasMore) {
    const { data, error } = await supabase
      .from(PRODUCT_LIST_TABLE)
      .select(PRODUCT_COLUMNS)
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

export const fetchPipeInventoryEntries = async (months) => {
  if (!months.length) return { weeklyRows: [], legacyRows: [] }

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
      .in(
        'period_start_date',
        months.map((month) => month.monthValue),
      )
      .in('metric_key', [METRIC_KEYS.received, METRIC_KEYS.used]),
  ])

  if (weeklyResult.error) {
    throw new Error(weeklyResult.error.message ?? '공무부 입고 데이터를 불러오지 못했습니다.')
  }
  if (legacyResult.error) {
    throw new Error(legacyResult.error.message ?? '공무부 입고 데이터를 불러오지 못했습니다.')
  }

  return { weeklyRows: weeklyResult.data ?? [], legacyRows: legacyResult.data ?? [] }
}

export const sumPipeTonsForMonth = ({ weeklyRows, legacyRows }, month) => {
  const normalize = (value) => String(value ?? '').trim()
  const toNumber = (value) => {
    const number = Number(value)
    return Number.isFinite(number) ? number : 0
  }

  const monthWeeklyRows = weeklyRows.filter((row) => {
    const startDate = normalize(row?.period_start_date)
    return startDate >= month.monthValue && startDate <= month.monthEndValue
  })
  const targetRows =
    monthWeeklyRows.length > 0
      ? monthWeeklyRows
      : legacyRows.filter((row) => normalize(row?.period_start_date) === month.monthValue)

  return targetRows.reduce(
    (accumulator, row) => {
      const metricKey = normalize(row?.metric_key)
      if (metricKey === METRIC_KEYS.received) accumulator.received += toNumber(row?.numeric_value)
      if (metricKey === METRIC_KEYS.used) accumulator.used += toNumber(row?.numeric_value)
      return accumulator
    },
    { received: 0, used: 0 },
  )
}
