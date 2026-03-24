<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/button/Button.vue'

const PRODUCT_LIST_TABLE = 'product_list'
const PRODUCTION_REPAIR_HISTORY_TABLE = 'production_repair_history'

const emit = defineEmits(['go-back'])
const props = defineProps({
  showBackButton: { type: Boolean, default: true },
})
const currentPage = ref(1)
const loading = ref(false)
const errorMessage = ref('')
const rows = ref([])
const repairHistoryRows = ref([])
const isRepairDialogOpen = ref(false)
const savingRepairEntry = ref(false)
const deletingRepairEntry = ref(false)
const repairEntryError = ref('')
const editingRepairId = ref(null)
const isPrinting = ref(false)

const now = new Date()
const reportYear = now.getFullYear()
const reportMonth = now.getMonth()
const reportYearLabel = `${reportYear}년`
const reportMonthLabel = `${reportMonth + 1}월`
const previousMonthLabel = `${reportMonth === 0 ? 12 : reportMonth}월`
const reportMonthStart = new Date(reportYear, reportMonth, 1)
const reportMonthEnd = new Date(reportYear, reportMonth + 1, 0)
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
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
const formatTestDate = (date) =>
  `${String(date.getFullYear()).padStart(4, '0')}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`
const formatIsoDate = (date) =>
  `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const categoryMeta = [
  { key: 'head', label: '헤드', color: '#10b981', tone: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  { key: 'hole', label: '홀', color: '#06b6d4', tone: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
  { key: 'groove', label: '그루브', color: '#8b5cf6', tone: 'bg-violet-50 border-violet-200 text-violet-800' },
  { key: 'nasa', label: '나사', color: '#f59e0b', tone: 'bg-amber-50 border-amber-200 text-amber-800' },
]

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}
const normalizeText = (value) => String(value ?? '').trim()
const isCompletedOrShipped = (row) => Boolean(row?.complete) || Boolean(row?.shipment)
const formatCount = (value, unit = '개') => `${Number(value || 0).toLocaleString('ko-KR')}${unit}`
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`
const formatRepairCost = (row) => (Boolean(row?.is_warranty) ? '무상' : formatCurrency(row?.cost))
const sanitizeMoneyInput = (value) => String(value ?? '').replace(/\D/g, '')
const formatShortMonthDay = (value) => {
  const parsed = parseFlexibleDate(value)
  if (!parsed) return normalizeText(value) || '-'
  return `${String(parsed.getMonth() + 1).padStart(2, '0')}월 ${String(parsed.getDate()).padStart(2, '0')}일`
}
const currentWeekTuesday = getUpcomingTuesday(now)

const createDefaultRepairForm = (row = null) =>
  row
    ? {
        repairedAt: row.repaired_at ?? formatIsoDate(new Date()),
        equipment: row.equipment ?? '',
        detail: row.detail ?? '',
        cost: row.cost == null ? '' : String(row.cost),
        isWarranty: Boolean(row.is_warranty),
      }
    : {
        repairedAt: formatIsoDate(new Date()),
        equipment: '',
        detail: '',
        cost: '',
        isWarranty: false,
      }

const repairForm = ref(createDefaultRepairForm())

const parseFlexibleDate = (value, fallbackYear = now.getFullYear()) => {
  const raw = normalizeText(value)
  if (!raw) return null

  const monthDotDay = raw.match(/^(\d{1,2})\.(\d{1,2})$/)
  if (monthDotDay) {
    const [, month, day] = monthDotDay
    const parsed = new Date(fallbackYear, Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

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

const getMonthlyReferenceDate = (row) => parseFlexibleDate(row?.test_date)

const isMonthRow = (row, monthIndex) => {
  const date = getMonthlyReferenceDate(row)
  if (!date) return false
  return date.getFullYear() === reportYear && date.getMonth() === monthIndex
}
const isYearRow = (row) => {
  const date = getMonthlyReferenceDate(row)
  if (!date) return false
  return date.getFullYear() === reportYear
}

const fetchRows = async () => {
  const startOfYear = new Date(reportYear, 0, 1)
  const endOfYear = new Date(reportYear, 11, 31)

  const { data, error } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .select('id,work_type,head,hole,groove,test_date,complete,shipment')
    .or('complete.eq.true,shipment.eq.true')
    .gte('test_date', formatTestDate(startOfYear))
    .lte('test_date', formatTestDate(endOfYear))
    .order('id', { ascending: false })

  if (error) {
    throw new Error(error.message ?? '생산 데이터를 불러오지 못했습니다.')
  }

  rows.value = data ?? []
}

const fetchRepairHistory = async () => {
  const { data, error } = await supabase
    .from(PRODUCTION_REPAIR_HISTORY_TABLE)
    .select('id,repaired_at,equipment,detail,cost,is_warranty,created_at')
    .gte('repaired_at', formatIsoDate(reportMonthStart))
    .lte('repaired_at', formatIsoDate(reportMonthEnd))
    .order('repaired_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) {
    throw new Error(error.message ?? '수리내역 데이터를 불러오지 못했습니다.')
  }

  repairHistoryRows.value = data ?? []
}

const fetchReportData = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    await Promise.all([fetchRows(), fetchRepairHistory()])
  } catch (error) {
    errorMessage.value = error?.message ?? '생산 데이터를 불러오지 못했습니다.'
    rows.value = []
    repairHistoryRows.value = []
  } finally {
    loading.value = false
  }
}

const currentMonthRows = computed(() => rows.value.filter((row) => isCompletedOrShipped(row) && isMonthRow(row, reportMonth)))
const previousMonthRows = computed(() =>
  rows.value.filter((row) => isCompletedOrShipped(row) && isMonthRow(row, reportMonth === 0 ? 11 : reportMonth - 1)),
)
const currentYearRows = computed(() => rows.value.filter((row) => isCompletedOrShipped(row) && isYearRow(row)))
const currentWeekTargetRows = computed(() =>
  rows.value.filter((row) => {
    const date = getMonthlyReferenceDate(row)
    return date ? startOfDay(date).getTime() === currentWeekTuesday.getTime() : false
  }),
)
const currentWeekRows = computed(() => currentWeekTargetRows.value.filter((row) => isCompletedOrShipped(row)))
const currentWeekPendingRows = computed(() => currentWeekTargetRows.value.filter((row) => !isCompletedOrShipped(row)))

const buildCategoryCounts = (targetRows) => {
  const head = targetRows.reduce((sum, row) => sum + toNumber(row?.head), 0)
  const hole = targetRows.reduce((sum, row) => sum + toNumber(row?.hole), 0)
  const groove = targetRows.reduce((sum, row) => sum + toNumber(row?.groove), 0)
  const nasa = targetRows
    .filter((row) => normalizeText(row?.work_type) === '나사')
    .reduce((sum, row) => sum + toNumber(row?.head), 0)

  return { head, hole, groove, nasa }
}

const currentCounts = computed(() => buildCategoryCounts(currentMonthRows.value))
const previousCounts = computed(() => buildCategoryCounts(previousMonthRows.value))
const currentYearCounts = computed(() => buildCategoryCounts(currentYearRows.value))
const currentWeekCounts = computed(() => buildCategoryCounts(currentWeekRows.value))
const currentWeekPendingCounts = computed(() => buildCategoryCounts(currentWeekPendingRows.value))
const currentMonthTotal = computed(() => Object.values(currentCounts.value).reduce((sum, value) => sum + toNumber(value), 0))
const currentWeekSummaryRows = computed(() =>
  categoryMeta.map((item) => ({
    ...item,
    completedValue: currentWeekCounts.value[item.key],
    pendingValue: currentWeekPendingCounts.value[item.key],
  })),
)
const currentYearSummaryRows = computed(() =>
  categoryMeta.map((item) => ({
    ...item,
    value: currentYearCounts.value[item.key],
  })),
)

const categoryChartRows = computed(() =>
  categoryMeta.map((item) => {
    const monthValue = currentCounts.value[item.key]
    const previousValue = previousCounts.value[item.key]
    return {
      ...item,
      yearValue: currentYearCounts.value[item.key],
      monthValue,
      previousValue,
      diff: monthValue - previousValue,
      share: currentMonthTotal.value ? Math.round((monthValue / currentMonthTotal.value) * 100) : 0,
    }
  }),
)

const chartGradient = computed(() => {
  const monthTotal = categoryChartRows.value.reduce((sum, item) => sum + item.monthValue, 0)
  if (!monthTotal) return 'conic-gradient(#e2e8f0 0deg 360deg)'

  let currentDegree = 0
  const segments = categoryChartRows.value.map((item) => {
    const degree = (item.monthValue / monthTotal) * 360
    const start = currentDegree
    const end = currentDegree + degree
    currentDegree = end
    return `${item.color} ${start}deg ${end}deg`
  })
  return `conic-gradient(${segments.join(', ')})`
})

const totalRepairCost = computed(() => repairHistoryRows.value.reduce((sum, row) => sum + toNumber(row?.cost), 0))

const resetRepairForm = () => {
  repairForm.value = createDefaultRepairForm()
  editingRepairId.value = null
}

const openRepairDialog = (row = null) => {
  repairEntryError.value = ''
  if (row) {
    editingRepairId.value = row.id
    repairForm.value = createDefaultRepairForm(row)
  } else {
    resetRepairForm()
  }
  isRepairDialogOpen.value = true
}

const closeRepairDialog = () => {
  if (savingRepairEntry.value || deletingRepairEntry.value) return
  repairEntryError.value = ''
  isRepairDialogOpen.value = false
}

const saveRepairEntry = async () => {
  repairEntryError.value = ''

  const repairedAt = normalizeText(repairForm.value.repairedAt)
  const equipment = normalizeText(repairForm.value.equipment)
  const detail = normalizeText(repairForm.value.detail)
  const cost = Number(sanitizeMoneyInput(repairForm.value.cost) || 0)
  const isWarranty = Boolean(repairForm.value.isWarranty)

  if (!repairedAt) {
    repairEntryError.value = '수리일자를 입력해주세요.'
    return
  }
  if (!equipment) {
    repairEntryError.value = '설비명을 입력해주세요.'
    return
  }
  if (!detail) {
    repairEntryError.value = '수리 내용을 입력해주세요.'
    return
  }

  savingRepairEntry.value = true

  const query = editingRepairId.value
    ? supabase
        .from(PRODUCTION_REPAIR_HISTORY_TABLE)
        .update({
          repaired_at: repairedAt,
          equipment,
          detail,
          cost: isWarranty ? 0 : cost,
          is_warranty: isWarranty,
        })
        .eq('id', editingRepairId.value)
    : supabase.from(PRODUCTION_REPAIR_HISTORY_TABLE).insert({
        repaired_at: repairedAt,
        equipment,
        detail,
        cost: isWarranty ? 0 : cost,
        is_warranty: isWarranty,
      })
  const { error } = await query

  savingRepairEntry.value = false

  if (error) {
    repairEntryError.value = error.message ?? '수리내역을 저장하지 못했습니다.'
    return
  }

  try {
    await fetchRepairHistory()
    closeRepairDialog()
  } catch (fetchError) {
    repairEntryError.value = fetchError?.message ?? '수리내역 목록을 새로고침하지 못했습니다.'
  }
}

const deleteRepairEntry = async (rowId) => {
  repairEntryError.value = ''
  const targetRow = repairHistoryRows.value.find((row) => row.id === rowId)
  const confirmed = typeof window === 'undefined' ? true : window.confirm(`${targetRow?.equipment || '선택한'} 수리내역을 삭제할까요?`)
  if (!confirmed) return
  deletingRepairEntry.value = true

  const { error } = await supabase.from(PRODUCTION_REPAIR_HISTORY_TABLE).delete().eq('id', rowId)

  deletingRepairEntry.value = false

  if (error) {
    repairEntryError.value = error.message ?? '수리내역 삭제에 실패했습니다.'
    return
  }

  repairHistoryRows.value = repairHistoryRows.value.filter((row) => row.id !== rowId)
  if (editingRepairId.value === rowId) {
    closeRepairDialog()
    resetRepairForm()
  }
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
  await fetchReportData()
})
</script>

<template>
  <section class="report-root min-h-screen bg-slate-100">
    <header class="report-header sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-[11px] font-bold tracking-[0.12em] text-slate-500">생산부 보고자료</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900 md:text-xl">생산부 대표 보고</h1>
          <p class="mt-2 text-[13px] text-slate-600">{{ reportYearLabel }} 누적과 {{ reportMonthLabel }} 생산 현황입니다.</p>
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
        <button
          type="button"
          class="rounded-xl bg-slate-100 px-4 py-2.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200"
          @click="openRepairDialog"
        >
          수리내역 등록
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        생산 데이터를 불러오는 중입니다.
      </div>
      <div v-else-if="errorMessage" class="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {{ errorMessage }}
      </div>

      <template v-else>
        <div v-show="currentPage === 1 || isPrinting" class="report-page report-page-break space-y-6">
          <div class="report-print-title">생산부 대표 보고 · 1페이지 요약본</div>
          <section class="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-orange-50 p-6 shadow-sm">
            <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p class="text-[12px] font-bold text-rose-700">{{ reportYearLabel }} 누적 생산 현황</p>
                <h2 class="mt-2 text-2xl font-extrabold text-slate-900">{{ reportYearLabel }} 누적 / {{ reportMonthLabel }} 생산 비교</h2>
                <p class="mt-2 text-sm text-slate-600">검수일 기준, 완료 또는 출하 건만 반영합니다.</p>
              </div>
              <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm">
                <p class="text-[12px] font-bold text-rose-700">{{ reportYearLabel }}</p>
                <p class="mt-1 text-3xl font-extrabold text-slate-900">누적 생산</p>
                <p class="mt-2 text-[12px] text-slate-500">{{ reportMonthLabel }}과 구분해서 확인</p>
              </div>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="grid items-stretch gap-4 xl:grid-cols-2">
              <article class="h-full rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p class="text-[13px] font-extrabold text-rose-900">이번주 생산량</p>
                <p class="mt-1 text-[11px] font-semibold text-rose-700">{{ formatTestDate(currentWeekTuesday) }} 검수 기준</p>
                <div class="mt-4 space-y-2">
                  <div
                    v-for="item in currentWeekSummaryRows"
                    :key="`${item.key}-week`"
                    class="grid min-h-[58px] grid-cols-[72px_1fr_1fr] items-center gap-2 rounded-xl bg-white/80 px-3 py-2"
                  >
                    <div class="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: item.color }" />
                      <span>{{ item.label }}</span>
                    </div>
                    <div class="text-center">
                      <p class="text-[10px] font-bold text-slate-500">완료/출하</p>
                      <p class="text-sm font-extrabold text-slate-900">{{ formatCount(item.completedValue) }}</p>
                    </div>
                    <div class="text-center">
                      <p class="text-[10px] font-bold text-slate-500">미완료</p>
                      <p class="text-sm font-extrabold text-slate-900">{{ formatCount(item.pendingValue) }}</p>
                    </div>
                  </div>
                </div>
              </article>

              <article class="h-full rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-[13px] font-extrabold text-slate-900">{{ reportYearLabel }} 누적</p>
                <p class="mt-1 text-[11px] font-semibold text-slate-500">작업완료 또는 출하완료 기준 누적</p>
                <div class="mt-4 space-y-2">
                  <div
                    v-for="item in currentYearSummaryRows"
                    :key="`${item.key}-year`"
                    class="grid min-h-[58px] grid-cols-[72px_1fr_1fr] items-center gap-2 rounded-xl bg-white px-3 py-2"
                  >
                    <div class="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: item.color }" />
                      <span>{{ item.label }}</span>
                    </div>
                    <div class="col-span-2 text-center">
                      <p class="text-[10px] font-bold text-slate-500">완료/출하 누적</p>
                      <p class="text-sm font-extrabold text-slate-900">{{ formatCount(item.value) }}</p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="production-print-grid-main grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <article class="rounded-2xl border border-slate-200 bg-white p-5">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-[13px] font-extrabold text-slate-900">{{ reportMonthLabel }} 생산 항목 비중</p>
                    <p class="mt-1 text-[12px] text-slate-500">이번 달 수량 기준</p>
                  </div>
                  <span class="text-[11px] font-bold text-slate-500">항목별 비중</span>
                </div>
                <div class="mt-5 grid gap-5 lg:grid-cols-[240px_1fr] lg:items-center">
                  <div class="mx-auto flex h-52 w-52 items-center justify-center rounded-full border border-slate-200" :style="{ background: chartGradient }">
                    <div class="flex h-36 w-36 items-center justify-center rounded-full bg-white text-center">
                      <div>
                        <p class="text-[11px] font-bold text-slate-400">{{ reportMonthLabel }}</p>
                        <p class="mt-1 text-xl font-extrabold text-slate-900">비중</p>
                      </div>
                    </div>
                  </div>
                  <div class="divide-y divide-slate-200">
                    <div
                      v-for="item in categoryChartRows"
                      :key="item.key"
                      class="grid grid-cols-[96px_1fr_84px] items-center gap-3 py-3"
                    >
                      <div class="flex items-center gap-2 text-left text-sm font-semibold text-slate-900">
                        <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: item.color }" />
                        <span>{{ item.label }}</span>
                      </div>
                      <div class="text-center text-[12px] font-bold text-slate-500">{{ item.share }}%</div>
                      <div class="text-right text-sm font-extrabold text-slate-900">{{ formatCount(item.monthValue) }}</div>
                    </div>
                  </div>
                </div>
              </article>

              <article class="rounded-2xl border border-slate-200 bg-white p-5">
                <p class="text-[13px] font-extrabold text-slate-900">{{ previousMonthLabel }} / {{ reportMonthLabel }} 비교</p>
                <div class="mt-4">
                  <table class="min-w-full table-fixed border-collapse text-sm">
                    <thead class="border-b border-slate-200 text-[12px] font-bold text-slate-600">
                      <tr>
                        <th class="w-[110px] px-4 py-3 text-left">항목</th>
                        <th class="px-4 py-3 text-center">{{ previousMonthLabel }}</th>
                        <th class="px-4 py-3 text-center">{{ reportMonthLabel }}</th>
                        <th class="px-4 py-3 text-center">증감</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in categoryChartRows"
                        :key="`${item.key}-compare`"
                        class="border-t border-slate-200"
                      >
                        <td class="w-[110px] px-4 py-4 text-left font-bold text-slate-900">
                          <div class="flex items-center gap-2">
                            <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: item.color }" />
                            <span>{{ item.label }}</span>
                          </div>
                        </td>
                        <td class="px-4 py-4 text-center font-semibold text-slate-500">{{ formatCount(item.previousValue) }}</td>
                        <td class="px-4 py-4 text-center font-extrabold text-slate-900">{{ formatCount(item.monthValue) }}</td>
                        <td
                          class="px-4 py-4 text-center font-extrabold"
                          :class="item.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'"
                        >
                          {{ item.diff >= 0 ? '+' : '' }}{{ formatCount(item.diff) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </section>
        </div>

        <div v-show="currentPage === 2 || isPrinting" class="report-page space-y-6">
          <div class="report-print-title">생산부 대표 보고 · 2페이지 디테일</div>
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[13px] font-extrabold text-slate-900">기계 수리 내역</p>
                <p class="mt-1 text-[12px] text-slate-500">{{ reportMonthLabel }} 설비 유지보수 기준</p>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">{{ repairHistoryRows.length }}건</span>
            </div>
            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr class="bg-slate-50 text-slate-600">
                    <th class="border border-slate-200 px-3 py-2 text-center">일자</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">설비명</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">수리 내역</th>
                    <th class="border border-slate-200 px-3 py-2 text-center">비용</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="repairHistoryRows.length === 0" class="bg-white">
                    <td colspan="4" class="border border-slate-200 px-3 py-8 text-center text-slate-500">{{ reportMonthLabel }} 수리내역이 없습니다.</td>
                  </tr>
                  <tr
                    v-for="row in repairHistoryRows"
                    :key="row.id"
                    class="cursor-pointer bg-white transition hover:bg-slate-50"
                    @click="openRepairDialog(row)"
                  >
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ formatShortMonthDay(row.repaired_at) }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.equipment }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.detail }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ formatRepairCost(row) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="production-print-grid-2 grid gap-4 md:grid-cols-2">
              <article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p class="text-[13px] font-extrabold text-slate-900">{{ reportMonthLabel }} 수리 건수</p>
                <p class="mt-2 text-3xl font-extrabold text-slate-900">{{ repairHistoryRows.length }}건</p>
              </article>
              <article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p class="text-[13px] font-extrabold text-slate-900">{{ reportMonthLabel }} 수리 비용</p>
                <p class="mt-2 text-3xl font-extrabold text-slate-900">{{ formatCurrency(totalRepairCost) }}</p>
              </article>
            </div>
          </section>
        </div>
      </template>
    </main>

    <div v-if="isRepairDialogOpen" class="report-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div class="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl md:p-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[13px] font-extrabold text-slate-900">{{ editingRepairId ? '수리내역 수정' : '수리내역 등록' }}</p>
            <p class="mt-1 text-[12px] text-slate-500">{{ reportMonthLabel }} 설비 유지보수 내역을 실제 데이터로 저장합니다.</p>
          </div>
          <button type="button" class="text-sm font-semibold text-slate-500 hover:text-slate-700" @click="closeRepairDialog">닫기</button>
        </div>

        <div class="production-print-grid-2 mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">수리일자</p>
            <input
              v-model="repairForm.repairedAt"
              type="date"
              class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </div>
          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">비용</p>
            <input
              :value="Number(repairForm.cost || 0).toLocaleString('ko-KR')"
              type="text"
              inputmode="numeric"
              class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              placeholder="0"
              :disabled="repairForm.isWarranty"
              @input="repairForm.cost = sanitizeMoneyInput($event.target.value)"
            />
          </div>
          <div class="md:col-span-2">
            <label class="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900">
              <span class="font-semibold">무상수리</span>
              <input
                v-model="repairForm.isWarranty"
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
            </label>
          </div>
          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">설비명</p>
            <input
              v-model="repairForm.equipment"
              type="text"
              class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              placeholder="예: 레이저 1호기"
            />
          </div>
          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">수리 내역</p>
            <textarea
              v-model="repairForm.detail"
              rows="4"
              class="min-h-[112px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              placeholder="수리 내용을 입력해주세요"
            />
          </div>
        </div>

        <p v-if="repairEntryError" class="mt-4 text-sm font-bold text-red-600">{{ repairEntryError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <Button
            v-if="editingRepairId"
            class="h-10 px-4 text-sm"
            variant="outline"
            :disabled="savingRepairEntry || deletingRepairEntry"
            @click="deleteRepairEntry(editingRepairId)"
          >
            {{ deletingRepairEntry ? '삭제 중...' : '삭제' }}
          </Button>
          <Button class="h-10 px-4 text-sm" variant="outline" :disabled="savingRepairEntry || deletingRepairEntry" @click="closeRepairDialog">닫기</Button>
          <Button class="h-10 px-4 text-sm" :disabled="savingRepairEntry || deletingRepairEntry" @click="saveRepairEntry">{{ savingRepairEntry ? '저장 중...' : editingRepairId ? '수정' : '저장' }}</Button>
        </div>
      </div>
    </div>
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

  .report-header,
  .report-dialog {
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

  .production-print-grid-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }

  .production-print-grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .production-print-grid-main {
    grid-template-columns: 1.05fr 0.95fr !important;
  }
}
</style>
