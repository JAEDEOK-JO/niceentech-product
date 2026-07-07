import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { normalizeProductionWorkType } from '@/utils/productionStatus'

const PRODUCT_LIST_TABLE = 'product_list'
const PRODUCT_COLUMNS_WITH_INCH =
  'id,work_type,head,inch,test_date,drawing_date,complete,shipment,hold,worker_t,worker_main,worker_nasa,worker_welding'
const PRODUCT_COLUMNS_LEGACY =
  'id,work_type,head,test_date,drawing_date,complete,shipment,hold,worker_t,worker_main,worker_nasa,worker_welding'

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

// 마지막으로 끝난 반기 = 조회 기본값
export const getLatestClosedHalf = (now = new Date()) => {
  if (now.getMonth() >= 6) return { year: now.getFullYear(), half: 1 }
  return { year: now.getFullYear() - 1, half: 2 }
}

const buildHalfMonths = (year, half) => {
  const startMonthIndex = half === 1 ? 0 : 6
  return Array.from({ length: 6 }, (_, i) => {
    const monthIndex = startMonthIndex + i
    return {
      key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      label: `${monthIndex + 1}월`,
      year,
      monthIndex,
    }
  })
}

const isDateInMonth = (date, month) =>
  Boolean(date) && date.getFullYear() === month.year && date.getMonth() === month.monthIndex

const isDateInHalf = (date, year, half) => {
  if (!date || date.getFullYear() !== year) return false
  const m = date.getMonth()
  return half === 1 ? m < 6 : m >= 6
}

// 인치가 기록된 현장은 헤드 대신 인치로 작업량을 적은 것 → 작업량에선 헤드 제외.
// totalHeadQty는 실제 헤드 수 전체 합계(표시용).
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

const PROCESS_DEFS = [
  { key: 'worker_t', label: 'T' },
  { key: 'worker_main', label: '메인' },
  { key: 'worker_nasa', label: '나사' },
  { key: 'worker_welding', label: '용접' },
]

export const useProductionHalfYearData = () => {
  const initial = getLatestClosedHalf()
  const year = ref(initial.year)
  const half = ref(initial.half)
  const loading = ref(false)
  const errorMessage = ref('')
  const productRows = ref([])

  const months = computed(() => buildHalfMonths(year.value, half.value))
  const periodLabel = computed(
    () => `${year.value}년 ${half.value === 1 ? '상반기 (1~6월)' : '하반기 (7~12월)'}`,
  )

  // 반기 내 생산완료 행 (test_date 기준, 파싱된 날짜 포함)
  const halfProducedRows = computed(() =>
    productRows.value
      .map((row) => ({ row, date: parseFlexibleDate(row?.test_date) }))
      .filter(
        ({ row, date }) => isProductionCompleted(row) && isDateInHalf(date, year.value, half.value),
      ),
  )

  const monthlyProduction = computed(() =>
    months.value.map((month) => {
      const monthEntries = halfProducedRows.value.filter(({ date }) => isDateInMonth(date, month))
      const rows = monthEntries.map(({ row }) => row)
      const work = sumWorkQuantities(rows)
      const shippedRows = rows.filter((row) => isShipped(row))
      const shipped = sumWorkQuantities(shippedRows)
      return {
        ...month,
        siteCount: rows.length,
        headQty: work.headQty,
        inchQty: work.inchQty,
        totalHeadQty: work.totalHeadQty,
        shippedHeadQty: shipped.totalHeadQty,
        unshippedHeadQty: work.totalHeadQty - shipped.totalHeadQty,
        unshippedSiteCount: rows.length - shippedRows.length,
      }
    }),
  )

  const workTypeBreakdown = computed(() => {
    const buckets = new Map()
    for (const { row } of halfProducedRows.value) {
      const label = normalizeProductionWorkType(row?.work_type)
      const bucket = buckets.get(label) ?? { label, siteCount: 0, totalHeadQty: 0, inchQty: 0 }
      bucket.siteCount += 1
      bucket.totalHeadQty += toNumber(row?.head)
      bucket.inchQty += toNumber(row?.inch)
      buckets.set(label, bucket)
    }
    return Array.from(buckets.values()).sort((a, b) => b.totalHeadQty - a.totalHeadQty)
  })

  const processMetrics = computed(() =>
    PROCESS_DEFS.map((def) => {
      const doneRows = halfProducedRows.value
        .filter(({ row }) => isCompletedStatus(row?.[def.key]))
        .map(({ row }) => row)
      return {
        key: def.key,
        label: def.label,
        siteCount: doneRows.length,
        totalHeadQty: doneRows.reduce((sum, row) => sum + toNumber(row?.head), 0),
      }
    }),
  )

  const shipmentSummary = computed(() => {
    const totals = monthlyProduction.value.reduce(
      (accumulator, month) => {
        accumulator.totalHeadQty += month.totalHeadQty
        accumulator.shippedHeadQty += month.shippedHeadQty
        accumulator.unshippedHeadQty += month.unshippedHeadQty
        accumulator.unshippedSiteCount += month.unshippedSiteCount
        return accumulator
      },
      { totalHeadQty: 0, shippedHeadQty: 0, unshippedHeadQty: 0, unshippedSiteCount: 0 },
    )
    return {
      ...totals,
      shippedRate: totals.totalHeadQty > 0 ? (totals.shippedHeadQty / totals.totalHeadQty) * 100 : 0,
    }
  })

  // 반기 내 도면배포 물량 (drawing_date 기준, 생산완료 여부 무관)
  const drawingSummary = computed(() => {
    const drawingRows = productRows.value.filter((row) =>
      isDateInHalf(parseFlexibleDate(row?.drawing_date), year.value, half.value),
    )
    const work = sumWorkQuantities(drawingRows)
    const producedHead = shipmentSummary.value.totalHeadQty
    return {
      siteCount: drawingRows.length,
      totalHeadQty: work.totalHeadQty,
      inchQty: work.inchQty,
      producedHead,
      conversionRate: work.totalHeadQty > 0 ? (producedHead / work.totalHeadQty) * 100 : 0,
    }
  })

  const summary = computed(() => {
    const list = monthlyProduction.value
    const totalHeadQty = list.reduce((sum, month) => sum + month.totalHeadQty, 0)
    const inchQty = list.reduce((sum, month) => sum + month.inchQty, 0)
    const siteCount = list.reduce((sum, month) => sum + month.siteCount, 0)
    const activeMonths = list.filter((month) => month.totalHeadQty > 0)
    const sorted = [...activeMonths].sort((a, b) => b.totalHeadQty - a.totalHeadQty)
    return {
      totalHeadQty,
      inchQty,
      siteCount,
      monthlyAvgHeadQty: activeMonths.length > 0 ? totalHeadQty / activeMonths.length : 0,
      bestMonth: sorted[0] ?? null,
      worstMonth: sorted.length > 0 ? sorted[sorted.length - 1] : null,
    }
  })

  const canGoNext = computed(() => {
    const latest = getLatestClosedHalf()
    if (year.value < latest.year) return true
    return year.value === latest.year && half.value < latest.half
  })

  const movePeriod = (delta) => {
    let nextYear = year.value
    let nextHalf = half.value + delta
    if (nextHalf < 1) {
      nextYear -= 1
      nextHalf = 2
    } else if (nextHalf > 2) {
      nextYear += 1
      nextHalf = 1
    }
    const latest = getLatestClosedHalf()
    if (nextYear > latest.year || (nextYear === latest.year && nextHalf > latest.half)) return
    year.value = nextYear
    half.value = nextHalf
  }

  const fetchData = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      productRows.value = await fetchAllProductRows()
    } catch (error) {
      errorMessage.value = error?.message ?? '데이터를 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }

  return {
    year,
    half,
    loading,
    errorMessage,
    months,
    periodLabel,
    monthlyProduction,
    workTypeBreakdown,
    processMetrics,
    shipmentSummary,
    drawingSummary,
    summary,
    canGoNext,
    movePeriod,
    fetchData,
  }
}
