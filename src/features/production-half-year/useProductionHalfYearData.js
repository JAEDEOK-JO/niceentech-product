import { computed, ref } from 'vue'
import {
  buildHalfMonths,
  getLatestClosedHalf,
  isAfterThursdayNoon,
  isDateInHalf,
  isDateInMonth,
  isProductionCompleted,
  isValidDrawingForReport,
  parseDrawingDateTime,
  parseFlexibleDate,
  sumHeadQty,
} from './halfYearUtils'
import { fetchAllProductRows } from './halfYearRepositories'

export { getLatestClosedHalf } from './halfYearUtils'

const rateByHeads = (totalHeads, lateHeads) => {
  if (!totalHeads) return 0
  return (lateHeads / totalHeads) * 100
}

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

  const halfProducedRows = computed(() =>
    productRows.value
      .map((row) => ({ row, date: parseFlexibleDate(row?.test_date) }))
      .filter(
        ({ row, date }) => isProductionCompleted(row) && isDateInHalf(date, year.value, half.value),
      ),
  )

  /** 배포일 기준 + 검수일/배포일 연도 이상치 제외 */
  const halfDrawingRows = computed(() =>
    productRows.value
      .map((row) => ({ row, date: parseDrawingDateTime(row?.drawing_date) }))
      .filter(
        ({ row, date }) =>
          isDateInHalf(date, year.value, half.value) && isValidDrawingForReport(row, date),
      ),
  )

  const monthlyRows = computed(() =>
    months.value.map((month) => {
      const produced = halfProducedRows.value
        .filter(({ date }) => isDateInMonth(date, month))
        .map(({ row }) => row)

      const drawings = halfDrawingRows.value.filter(({ date }) => isDateInMonth(date, month))
      const lateDrawings = drawings.filter(({ date }) => isAfterThursdayNoon(date))
      const drawingProduced = drawings
        .map(({ row }) => row)
        .filter((row) => isProductionCompleted(row))

      const producedHeadQty = sumHeadQty(produced)
      const drawingHeadQty = sumHeadQty(drawings.map(({ row }) => row))
      const lateDrawingHeadQty = sumHeadQty(lateDrawings.map(({ row }) => row))
      const drawingProducedHeadQty = sumHeadQty(drawingProduced)

      return {
        ...month,
        producedSiteCount: produced.length,
        producedHeadQty,
        drawingSiteCount: drawings.length,
        drawingHeadQty,
        lateDrawingSiteCount: lateDrawings.length,
        lateDrawingHeadQty,
        lateDrawingRate: rateByHeads(drawingHeadQty, lateDrawingHeadQty),
        drawingProducedHeadQty,
        drawingConversionRate: rateByHeads(drawingHeadQty, drawingProducedHeadQty),
      }
    }),
  )

  const summary = computed(() => {
    const list = monthlyRows.value
    const producedHeadQty = list.reduce((sum, month) => sum + month.producedHeadQty, 0)
    const drawingHeadQty = list.reduce((sum, month) => sum + month.drawingHeadQty, 0)
    const lateDrawingHeadQty = list.reduce((sum, month) => sum + month.lateDrawingHeadQty, 0)
    const lateDrawingSiteCount = list.reduce((sum, month) => sum + month.lateDrawingSiteCount, 0)
    const drawingSiteCount = list.reduce((sum, month) => sum + month.drawingSiteCount, 0)
    const producedSiteCount = list.reduce((sum, month) => sum + month.producedSiteCount, 0)
    const drawingProducedHeadQty = list.reduce((sum, month) => sum + month.drawingProducedHeadQty, 0)
    const activeMonths = list.filter((month) => month.producedHeadQty > 0)
    const sorted = [...activeMonths].sort((a, b) => b.producedHeadQty - a.producedHeadQty)

    return {
      producedHeadQty,
      producedSiteCount,
      monthlyAvgHeadQty: activeMonths.length > 0 ? producedHeadQty / activeMonths.length : 0,
      drawingHeadQty,
      drawingSiteCount,
      lateDrawingHeadQty,
      lateDrawingSiteCount,
      lateDrawingRate: rateByHeads(drawingHeadQty, lateDrawingHeadQty),
      drawingProducedHeadQty,
      drawingConversionRate: rateByHeads(drawingHeadQty, drawingProducedHeadQty),
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
    void fetchData()
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
    monthlyRows,
    summary,
    canGoNext,
    movePeriod,
    fetchData,
  }
}
