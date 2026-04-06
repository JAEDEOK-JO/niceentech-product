<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/button/Button.vue'

const PRODUCT_LIST_TABLE = 'product_list'

const emit = defineEmits(['go-back'])
const props = defineProps({
  showBackButton: { type: Boolean, default: true },
})
const currentPage = ref(1)
const loading = ref(false)
const errorMessage = ref('')
const rows = ref([])
const monthRows = ref([])
const distributionRows = ref([])
const isPrinting = ref(false)

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
const formatKoreanDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일`
}
const formatIsoDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const formatShortDate = (value) => {
  const parsed = parseFlexibleDateTime(value)
  if (!parsed) return String(value ?? '').trim() || ''
  return `${String(parsed.getMonth() + 1).padStart(2, '0')}월 ${String(parsed.getDate()).padStart(2, '0')}일`
}
const formatDateTimeText = (value) => {
  const parsed = parseFlexibleDateTime(value)
  if (!parsed) return String(value ?? '').trim() || ''
  const mm = String(parsed.getMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getDate()).padStart(2, '0')
  const hh = String(parsed.getHours()).padStart(2, '0')
  const min = String(parsed.getMinutes()).padStart(2, '0')
  return `${mm}월 ${dd}일 ${hh}:${min}`
}
const formatPercent = (part, total) => {
  if (!total) return ''
  return `${Math.round((part / total) * 100)}%`
}
const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
const formatHeadQty = (value) => Number(value || 0).toLocaleString('ko-KR')
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const WORK_WEEK_DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6]
const getTuesdayOfCurrentWeek = (baseDate) => {
  const safe = startOfDay(baseDate)
  const day = safe.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = addDays(safe, mondayOffset)
  return addDays(monday, 1)
}
const getUpcomingTuesday = (baseDate) => {
  const safe = startOfDay(baseDate)
  const currentWeekTuesday = getTuesdayOfCurrentWeek(safe)
  return safe.getTime() > currentWeekTuesday.getTime() ? addDays(currentWeekTuesday, 7) : currentWeekTuesday
}
const getPreviousThursdayNoon = (testDate) => {
  const next = startOfDay(addDays(testDate, -5))
  next.setHours(12, 0, 0, 0)
  return next
}
const parseFlexibleDateTime = (value, fallbackYear = new Date().getFullYear()) => {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const meridiemMatch = raw.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/)
  let meridiemHour = null
  let meridiemMinute = 0
  if (meridiemMatch) {
    meridiemHour = Number(meridiemMatch[2])
    meridiemMinute = Number(meridiemMatch[3])
    if (meridiemMatch[1] === '오후' && meridiemHour < 12) meridiemHour += 12
    if (meridiemMatch[1] === '오전' && meridiemHour === 12) meridiemHour = 0
  }

  const fullMatch = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2}))?(?::(\d{2}))?/)
  if (fullMatch) {
    const [, y, m, d, hh = '0', mm = '0'] = fullMatch
    const hour = meridiemHour ?? Number(hh)
    const minute = meridiemMatch ? meridiemMinute : Number(mm)
    const next = new Date(Number(y), Number(m) - 1, Number(d), hour, minute)
    return Number.isNaN(next.getTime()) ? null : next
  }

  const monthDayMatch = raw.match(/(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2}))?(?::(\d{2}))?/)
  if (monthDayMatch) {
    const [, m, d, hh = '0', mm = '0'] = monthDayMatch
    const hour = meridiemHour ?? Number(hh)
    const minute = meridiemMatch ? meridiemMinute : Number(mm)
    const next = new Date(fallbackYear, Number(m) - 1, Number(d), hour, minute)
    return Number.isNaN(next.getTime()) ? null : next
  }

  const native = new Date(raw)
  return Number.isNaN(native.getTime()) ? null : native
}
const getDrawingDistributedAt = (row) => {
  if (!row?.drawing_date) return null
  const d = new Date(row.drawing_date)
  return Number.isNaN(d.getTime()) ? null : d
}
const getShipmentAt = (row, fallbackYear = new Date().getFullYear()) =>
  parseFlexibleDateTime(row?.shipment_date, fallbackYear) ?? parseFlexibleDateTime(row?.updated_at, fallbackYear)
const isOtherWorkTypeRow = (row) => String(row?.work_type ?? '').trim() === '기타'
const isDistributed = (row) =>
  Boolean(row?.drawing_date) || Boolean(row?.virtual_drawing_distributed)
const isDueRiskRow = (row, testDate) => {
  const dueDate = parseFlexibleDateTime(row?.delivery_due_date, testDate.getFullYear())
  if (!dueDate) return false
  return startOfDay(dueDate).getTime() <= startOfDay(testDate).getTime() && !isDistributed(row)
}
const isOnTimeShipment = (row) => {
  const shipmentDate = getShipmentAt(row)
  const dueDate = parseFlexibleDateTime(row?.delivery_due_date)
  if (!shipmentDate || !dueDate) return null
  return startOfDay(shipmentDate).getTime() <= startOfDay(dueDate).getTime()
}
const getWeekTone = (index) =>
  index === 0 ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border border-slate-200'
const getWeekdayIndex = (date) => {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}
const getPreviousWorkWeekStart = (date) => addDays(startOfDay(date), -7)
const formatMonthDayWeekday = (date) =>
  `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAY_LABELS[getWeekdayIndex(date)]})`

const thisWeekTuesday = computed(() => getUpcomingTuesday(new Date()))
const monthRange = computed(() => {
  const base = thisWeekTuesday.value
  return {
    start: new Date(base.getFullYear(), base.getMonth(), 1),
    end: new Date(base.getFullYear(), base.getMonth() + 1, 0),
  }
})
const monthLabel = computed(() => `${thisWeekTuesday.value.getMonth() + 1}월`)
const targetWeeks = computed(() => [{ key: 'this', index: 0, date: thisWeekTuesday.value }])
const weekRowsMap = computed(() =>
  Object.fromEntries(targetWeeks.value.map((week) => [week.key, rows.value.filter((row) => row.test_date === formatKoreanDate(week.date))])),
)
const monthlyDeliveryStats = computed(() => {
  const shippedRows = monthRows.value.filter((row) => Boolean(row?.shipment) || Boolean(getShipmentAt(row)))
  const measurableRows = shippedRows.filter((row) => isOnTimeShipment(row) !== null)
  const onTimeCount = measurableRows.filter((row) => isOnTimeShipment(row) === true).length
  const displayedOnTimeCount = onTimeCount
  const displayedMeasuredCount = measurableRows.length
  return {
    label: `${monthLabel.value} 누적 납기준수율`,
    value: displayedMeasuredCount ? formatPercent(displayedOnTimeCount, displayedMeasuredCount) : '-',
    note: shippedRows.length
      ? `${monthLabel.value} 출하 ${shippedRows.length}건 · 납기 비교 가능 ${measurableRows.length}건`
      : `${monthLabel.value} 출하 데이터 없음`,
    shippedCount: shippedRows.length,
    measurableCount: displayedMeasuredCount,
    onTimeCount: displayedOnTimeCount,
    delayedCount: Math.max(0, displayedMeasuredCount - displayedOnTimeCount),
  }
})
const weeklyDistributionCharts = computed(() =>
  targetWeeks.value.map((week) => {
    const startDate = getPreviousWorkWeekStart(week.date)
    const endDate = addDays(startDate, 6)
    const headSums = Array.from({ length: 7 }, () => 0)
    for (const row of distributionRows.value) {
      const drawingDate = getDrawingDistributedAt(row)
      if (!drawingDate) continue
      const drawingDay = startOfDay(drawingDate)
      if (drawingDay.getTime() < startDate.getTime() || drawingDay.getTime() > endDate.getTime()) continue
      const diffDays = Math.floor((drawingDay.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      if (diffDays < 0 || diffDays > 6) continue
      headSums[diffDays] += toNumber(row?.head)
    }
    const dailyCounts = WORK_WEEK_DAY_OFFSETS.map((offset) => {
      const targetDate = addDays(startDate, offset)
      return {
        label: WEEKDAY_LABELS[getWeekdayIndex(targetDate)],
        dateLabel: formatMonthDayWeekday(targetDate),
        headQty: headSums[offset],
      }
    })
    const maxHeadQty = Math.max(...dailyCounts.map((item) => item.headQty), 0)
    const totalHeadQty = dailyCounts.reduce((sum, item) => sum + item.headQty, 0)
    return {
      key: week.key,
      title: formatKoreanDate(week.date),
      totalHeadQty,
      maxHeadQty,
      days: dailyCounts.map((item) => ({
        ...item,
        ratioByMax:
          maxHeadQty > 0 && item.headQty > 0 ? Math.max(6, Math.round((item.headQty / maxHeadQty) * 100)) : 0,
        percentOfWeek: totalHeadQty > 0 ? Math.round((item.headQty / totalHeadQty) * 100) : 0,
        isPeak: maxHeadQty > 0 && item.headQty === maxHeadQty,
      })),
    }
  }),
)

const buildWeekSummary = (week) => {
  const targetRows = weekRowsMap.value[week.key] ?? []
  const totalCount = targetRows.length
  const distributedCount = targetRows.filter(isDistributed).length
  const totalHeadQty = targetRows.reduce((sum, row) => sum + toNumber(row?.head), 0)
  const distributedHeadQty = targetRows.filter(isDistributed).reduce((sum, row) => sum + toNumber(row?.head), 0)
  const drawingCompletedCount = targetRows.filter((row) => Boolean(row?.calculation)).length
  const dueRiskCount = targetRows.filter((row) => isDueRiskRow(row, week.date)).length

  const threshold = getPreviousThursdayNoon(week.date)
  const thursdayEligibleRows = targetRows.filter((row) => !isOtherWorkTypeRow(row))
  const distributedWithDrawingTime = thursdayEligibleRows.filter((row) =>
    getDrawingDistributedAt(row, week.date.getFullYear()),
  )
  const beforeNoonCount = distributedWithDrawingTime.filter((row) => {
    const drawingDate = getDrawingDistributedAt(row, week.date.getFullYear())
    return drawingDate && drawingDate.getTime() <= threshold.getTime()
  }).length
  const thursdayTargetCount = distributedWithDrawingTime.length

  const thursdayRateValue =
    week.index === 0
      ? formatPercent(beforeNoonCount, thursdayTargetCount)
      : ''
  const thursdayRateNote =
    week.index === 0
      ? `목요일 12시 이전 ${beforeNoonCount}/${thursdayTargetCount || 0}건`
      : '산출 시점 변동으로 집계 제외'

  return {
    ...week,
    totalCount,
    distributedCount,
    drawingCompletedCount,
    dueRiskCount,
    beforeNoonCount,
    threshold,
    cards: [
      {
        label: '도면 배포 현황',
        value: `${formatHeadQty(distributedHeadQty)}/${formatHeadQty(totalHeadQty)} 헤드`,
        note: `헤드 ${formatHeadQty(totalHeadQty)}개 중 ${formatHeadQty(distributedHeadQty)}개 배포 완료`,
        tone: 'bg-slate-50 border-slate-200 text-slate-800',
      },
      {
        label: '산출 완료율',
        value: formatPercent(drawingCompletedCount, totalCount),
        note: `${drawingCompletedCount}/${totalCount || 0}건 산출 완료`,
        tone: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      },
      {
        label: '납기 위험',
        value: `${dueRiskCount}건`,
        note: '납기일 도래 + 미배포 기준',
        tone: 'bg-amber-50 border-amber-200 text-amber-800',
      },
      {
        label: '목요일 12시 배포율',
        value: thursdayRateValue,
        note: thursdayRateNote,
        tone: 'bg-violet-50 border-violet-200 text-violet-800',
      },
    ],
  }
}

const weekSummaries = computed(() => targetWeeks.value.map(buildWeekSummary))
const detailedRows = computed(() =>
  weekSummaries.value.flatMap((week) =>
    (weekRowsMap.value[week.key] ?? []).map((row) => ({
      ...row,
      _weekLabel: formatKoreanDate(week.date),
    })),
  ),
)
const dueRiskRows = computed(() =>
  detailedRows.value
    .filter((row) => {
      const week = targetWeeks.value.find((item) => formatKoreanDate(item.date) === row.test_date)
      return week ? isDueRiskRow(row, week.date) : false
    })
    .sort((a, b) => {
      const aDate = parseFlexibleDateTime(a?.delivery_due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bDate = parseFlexibleDateTime(b?.delivery_due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return aDate - bDate
    }),
)
const pendingDistributionRows = computed(() =>
  detailedRows.value
    .filter((row) => !Boolean(row?.calculation))
    .sort((a, b) => {
      const aDate = parseFlexibleDateTime(a?.delivery_due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bDate = parseFlexibleDateTime(b?.delivery_due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return aDate - bDate
    }),
)
const lateDistributionRows = computed(() => {
  const firstWeek = targetWeeks.value[0]
  const threshold = getPreviousThursdayNoon(firstWeek.date)
  return (weekRowsMap.value[firstWeek.key] ?? [])
    .filter((row) => {
      if (isOtherWorkTypeRow(row)) return false
      const drawingDate = getDrawingDistributedAt(row, firstWeek.date.getFullYear())
      return drawingDate && drawingDate.getTime() > threshold.getTime()
    })
    .sort((a, b) => {
      const aDate = getDrawingDistributedAt(a)?.getTime() ?? 0
      const bDate = getDrawingDistributedAt(b)?.getTime() ?? 0
      return aDate - bDate
    })
})

const fetchRows = async () => {
  loading.value = true
  errorMessage.value = ''

  const testDates = targetWeeks.value.map((week) => formatKoreanDate(week.date))
  const { start, end } = monthRange.value
  const distributionWeekStart = getPreviousWorkWeekStart(targetWeeks.value[0]?.date ?? thisWeekTuesday.value)
  const distributionWeekEnd = addDays(distributionWeekStart, 7)
  const baseColumns =
    'id,no,initial,company,place,area,work_type,head,test_date,drawing_date,shipment_date,delivery_due_date,is_drawing,calculation,complete,delay_text'
  const withVirtualColumns = `${baseColumns},virtual_drawing_distributed`
  const monthColumns = 'id,no,initial,company,place,area,shipment,shipment_date,delivery_due_date,updated_at'
  const distributionColumns = 'id,head,drawing_date'

  let query = supabase.from(PRODUCT_LIST_TABLE).select(withVirtualColumns).in('test_date', testDates).order('test_date').order('no')
  let { data, error } = await query
  const { data: monthData, error: monthError } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .select(monthColumns)
    .gte('updated_at', `${formatIsoDate(start)}T00:00:00`)
    .lt('updated_at', `${formatIsoDate(addDays(end, 1))}T00:00:00`)
    .order('updated_at')
  const { data: distributionData, error: distributionError } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .select(distributionColumns)
    .gte('drawing_date', `${formatIsoDate(distributionWeekStart)}T00:00:00`)
    .lt('drawing_date', `${formatIsoDate(distributionWeekEnd)}T00:00:00`)
    .order('drawing_date')

  if (error && String(error.message ?? '').includes('virtual_drawing_distributed')) {
    ;({ data, error } = await supabase
      .from(PRODUCT_LIST_TABLE)
      .select(baseColumns)
      .in('test_date', testDates)
      .order('test_date')
      .order('no'))
  }

  if (error || monthError || distributionError) {
    rows.value = []
    monthRows.value = []
    distributionRows.value = []
    errorMessage.value = 'product_list 데이터를 불러오지 못했습니다.'
    loading.value = false
    return
  }

  rows.value = data ?? []
  monthRows.value = monthData ?? []
  distributionRows.value = distributionData ?? []
  loading.value = false
}

const printReport = async () => {
  if (typeof window === 'undefined') return
  isPrinting.value = true
  await nextTick()
  window.print()
  isPrinting.value = false
}

onMounted(async () => {
  await supabase.auth.getSession()
  await fetchRows()
})
</script>

<template>
  <section class="report-root min-h-screen bg-slate-100">
    <header class="report-header sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-[11px] font-bold tracking-[0.12em] text-slate-500">설계부 보고자료</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900 md:text-xl">설계부 화요일 회의 보고</h1>
        </div>
        <div class="flex shrink-0 gap-2">
          <Button class="shrink-0" variant="outline" @click="printReport">인쇄</Button>
          <Button v-if="props.showBackButton" class="shrink-0" variant="outline" @click="emit('go-back')">가이드로 돌아가기</Button>
        </div>
      </div>

      <div class="mx-auto flex max-w-7xl gap-1 px-4 pb-3 md:px-6">
        <button
          type="button"
          class="rounded-xl px-4 py-2.5 text-[13px] font-bold transition"
          :class="currentPage === 1 ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="currentPage = 1"
        >
          1페이지 · 요약본
        </button>
        <button
          type="button"
          class="rounded-xl px-4 py-2.5 text-[13px] font-bold transition"
          :class="currentPage === 2 ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="currentPage = 2"
        >
          2페이지 · 디테일
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div v-if="loading" class="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        product_list 데이터를 불러오는 중입니다.
      </div>

      <div v-else-if="errorMessage" class="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {{ errorMessage }}
      </div>

      <template v-else>
        <div v-show="currentPage === 1 || isPrinting" class="report-page report-page-break mt-6 space-y-6">
          <div class="report-print-title">설계부 화요일 회의 보고 · 1페이지 요약본</div>
          <section class="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-100 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm">
            <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 class="mt-2 text-2xl font-extrabold">{{ monthlyDeliveryStats.label }}</h2>
                <p class="mt-2 text-sm text-slate-600">{{ monthlyDeliveryStats.note }}</p>
                <div class="mt-4 flex flex-wrap gap-2 text-[12px] font-semibold">
                  <span class="rounded-full border border-sky-200 bg-white px-3 py-1 text-slate-700">출하 {{ monthlyDeliveryStats.shippedCount }}건</span>
                  <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">준수 {{ monthlyDeliveryStats.onTimeCount }}건</span>
                  <span class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">지연 {{ monthlyDeliveryStats.delayedCount }}건</span>
                </div>
              </div>
              <div class="rounded-3xl border border-white/80 bg-white px-5 py-4 text-center shadow-sm">
                <p class="text-[12px] font-bold text-sky-700">현재 준수율</p>
                <p class="mt-1 text-4xl font-extrabold">{{ monthlyDeliveryStats.value }}</p>
              </div>
            </div>
          </section>

          <section
            v-for="week in weekSummaries"
            :key="week.key"
            class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-[12px] font-bold text-slate-500">주간 현황</p>
                <h2 class="mt-1 text-base font-extrabold text-slate-900">
                  {{ formatKoreanDate(week.date) }}
                  <span class="ml-2 text-base font-extrabold text-orange-700">검수일 기준</span>
                </h2>
              </div>
            </div>

            <div class="design-print-grid-4 mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div v-for="card in week.cards" :key="`${week.key}-${card.label}`" class="rounded-2xl border p-4" :class="card.tone">
                <p class="text-[13px] font-bold">{{ card.label }}</p>
                <p class="mt-2 text-xl font-extrabold">{{ card.value }}</p>
                <p class="mt-1 text-[11px] font-semibold opacity-80">{{ card.note }}</p>
              </div>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[13px] font-extrabold text-slate-900">요일별 배포 도면 수량</p>
            </div>
            <div class="mt-4 space-y-4">
              <article
                v-for="chart in weeklyDistributionCharts"
                :key="`distribution-${chart.key}`"
                class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div class="flex items-center gap-2">
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                      최대 {{ formatHeadQty(chart.maxHeadQty) }} 헤드
                    </span>
                    <span class="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-700">
                      총 {{ formatHeadQty(chart.totalHeadQty) }} 헤드
                    </span>
                  </div>
                </div>
                <div class="mt-3 grid gap-2 md:grid-cols-7">
                  <div
                    v-for="day in chart.days"
                    :key="`${chart.key}-${day.label}`"
                    class="rounded-2xl border px-3 py-3 transition"
                    :class="
                      day.isPeak
                        ? 'border-orange-300 bg-orange-50/80 shadow-[0_0_0_1px_rgba(249,115,22,0.12)]'
                        : 'border-slate-200 bg-slate-50/80'
                    "
                  >
                    <div class="flex items-center justify-between">
                      <p class="text-[12px] font-bold" :class="day.isPeak ? 'text-orange-700' : 'text-slate-700'">{{ day.dateLabel }}</p>
                      <p class="text-[11px] font-bold" :class="day.isPeak ? 'text-orange-700' : 'text-slate-600'">{{ day.percentOfWeek }}%</p>
                    </div>
                    <p class="mt-2 text-lg font-extrabold text-slate-900">{{ formatHeadQty(day.headQty) }}</p>
                    <p class="mt-0.5 text-[10px] font-semibold text-slate-500">헤드</p>
                    <div class="mt-3 h-2.5 overflow-hidden rounded-full" :class="day.ratioByMax > 0 ? 'bg-slate-200' : 'bg-transparent'">
                      <div
                        v-if="day.ratioByMax > 0"
                        class="distribution-bar h-full rounded-full transition-all"
                        :class="
                          day.isPeak
                            ? 'bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 shadow-[0_0_10px_rgba(249,115,22,0.35)]'
                            : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500'
                        "
                        :style="{ width: `${day.ratioByMax}%` }"
                      />
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>

        <div v-show="currentPage === 2 || isPrinting" class="report-page mt-6 space-y-6">
          <div class="report-print-title">설계부 화요일 회의 보고 · 2페이지 디테일</div>
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[13px] font-extrabold text-slate-900">납기 위험 목록</p>
                <p class="mt-1 text-[12px] text-slate-500">납기일 도래 + 미배포 기준</p>
              </div>
              <span class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">{{ dueRiskRows.length }}건</span>
            </div>
            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr class="bg-slate-50 text-slate-600">
                    <th class="border border-slate-200 px-3 py-2 text-center">구분</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">도번</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">회사</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">현장</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">구역</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">납기일</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!dueRiskRows.length">
                    <td colspan="6" class="border border-slate-200 px-3 py-6 text-center text-slate-400">납기 위험 항목이 없습니다.</td>
                  </tr>
                  <tr v-for="row in dueRiskRows" :key="`risk-${row.id}`" class="bg-white">
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row._weekLabel }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ row.initial || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.company || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.place || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.area || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ formatShortDate(row.delivery_due_date) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[13px] font-extrabold text-slate-900">산출 안된 목록</p>
                <p class="mt-1 text-[12px] text-slate-500">산출서 미반영 기준</p>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">{{ pendingDistributionRows.length }}건</span>
            </div>
            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr class="bg-slate-50 text-slate-600">
                    <th class="border border-slate-200 px-3 py-2 text-center">구분</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">도번</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">회사</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">현장</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">구역</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">납기일</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!pendingDistributionRows.length">
                    <td colspan="6" class="border border-slate-200 px-3 py-6 text-center text-slate-400">미배포 항목이 없습니다.</td>
                  </tr>
                  <tr v-for="row in pendingDistributionRows" :key="`pending-${row.id}`" class="bg-white">
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row._weekLabel }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ row.initial || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.company || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.place || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.area || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ formatShortDate(row.delivery_due_date) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[13px] font-extrabold text-slate-900">목요일 12시 이후 배포 목록</p>
                <p class="mt-1 text-[12px] text-slate-500">금주 기준</p>
              </div>
              <span class="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700">{{ lateDistributionRows.length }}건</span>
            </div>
            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr class="bg-slate-50 text-slate-600">
                    <th class="border border-slate-200 px-3 py-2 text-center">배포시간</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">도번</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">회사</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">현장</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">구역</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">납기일</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!lateDistributionRows.length">
                    <td colspan="6" class="border border-slate-200 px-3 py-6 text-center text-slate-400">목요일 12시 이후 배포 건이 없습니다.</td>
                  </tr>
                  <tr v-for="row in lateDistributionRows" :key="`late-${row.id}`" class="bg-white">
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ formatDateTimeText(row.drawing_date) }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ row.initial || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.company || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.place || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.area || '' }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ formatShortDate(row.delivery_due_date) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </template>
    </main>
  </section>
</template>

<style scoped>
.report-print-title {
  display: none;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 8mm;
  }

  :global(html),
  :global(body) {
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .report-root {
    min-height: auto !important;
    background: #fff !important;
  }

  .report-header {
    display: none !important;
  }

  .report-page {
    display: block !important;
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .report-page-break {
    break-after: page;
    page-break-after: always;
  }

  .report-print-title {
    display: none !important;
  }

  .report-root :deep(main) {
    max-width: none !important;
    background: #fff !important;
  }

  .report-page > * {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .design-print-grid-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }
}
</style>
