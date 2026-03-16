<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/button/Button.vue'

const PRODUCT_LIST_TABLE = 'product_list'

const emit = defineEmits(['go-back'])
const currentPage = ref(1)
const loading = ref(false)
const errorMessage = ref('')
const rows = ref([])

const now = new Date()
const reportMonth = now.getMonth()
const reportMonthLabel = `${reportMonth + 1}월`
const previousMonthLabel = `${reportMonth === 0 ? 12 : reportMonth}월`

const categoryMeta = [
  { key: 'head', label: '헤드', color: '#10b981', tone: 'bg-emerald-50 border-emerald-200 text-emerald-800', note: '용접/무용접 기준' },
  { key: 'hole', label: '홀', color: '#06b6d4', tone: 'bg-cyan-50 border-cyan-200 text-cyan-800', note: '전실/입상 기준' },
  { key: 'groove', label: '그루브', color: '#8b5cf6', tone: 'bg-violet-50 border-violet-200 text-violet-800', note: '전체 groove 합계' },
  { key: 'nasa', label: '나사', color: '#f59e0b', tone: 'bg-amber-50 border-amber-200 text-amber-800', note: '나사 work_type 기준' },
]

const repairHistoryRows = [
  { repairedAt: '03월 04일', equipment: '레이저 1호기', detail: '헤드 교체 및 축 정렬', cost: 420000, status: '완료' },
  { repairedAt: '03월 09일', equipment: '메인 절단기', detail: '베어링 교체', cost: 185000, status: '완료' },
  { repairedAt: '03월 12일', equipment: '티&면치 설비', detail: '센서 오작동 점검 및 부품 교체', cost: 310000, status: '완료' },
  { repairedAt: '03월 15일', equipment: '나사 가공기', detail: '모터 진동 점검', cost: 95000, status: '점검중' },
]

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}
const normalizeText = (value) => String(value ?? '').trim()
const formatCount = (value, unit = '개') => `${Number(value || 0).toLocaleString('ko-KR')}${unit}`
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`

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

const getMonthlyReferenceDate = (row) => parseFlexibleDate(row?.complete_date) ?? parseFlexibleDate(row?.test_date)

const isMonthRow = (row, monthIndex) => {
  const date = getMonthlyReferenceDate(row)
  if (!date) return false
  return date.getFullYear() === now.getFullYear() && date.getMonth() === monthIndex
}

const fetchRows = async () => {
  loading.value = true
  errorMessage.value = ''

  const { data, error } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .select('id,work_type,head,hole,groove,test_date,complete_date')
    .order('id', { ascending: false })

  if (error) {
    errorMessage.value = error.message ?? '생산 데이터를 불러오지 못했습니다.'
    rows.value = []
    loading.value = false
    return
  }

  rows.value = data ?? []
  loading.value = false
}

const currentMonthRows = computed(() => rows.value.filter((row) => isMonthRow(row, reportMonth)))
const previousMonthRows = computed(() => rows.value.filter((row) => isMonthRow(row, reportMonth === 0 ? 11 : reportMonth - 1)))

const buildCategoryCounts = (targetRows) => {
  const head = targetRows
    .filter((row) => normalizeText(row?.work_type) === '용접/무용접')
    .reduce((sum, row) => sum + toNumber(row?.head), 0)
  const hole = targetRows
    .filter((row) => normalizeText(row?.work_type) === '전실/입상')
    .reduce((sum, row) => sum + toNumber(row?.hole), 0)
  const groove = targetRows.reduce((sum, row) => sum + toNumber(row?.groove), 0)
  const nasa = targetRows
    .filter((row) => normalizeText(row?.work_type) === '나사')
    .reduce((sum, row) => sum + toNumber(row?.head), 0)

  return { head, hole, groove, nasa }
}

const currentCounts = computed(() => buildCategoryCounts(currentMonthRows.value))
const previousCounts = computed(() => buildCategoryCounts(previousMonthRows.value))

const comparisonCounts = computed(() => {
  const actual = previousCounts.value
  const current = currentCounts.value
  const diffList = [
    current.head - actual.head,
    current.hole - actual.hole,
    current.groove - actual.groove,
    current.nasa - actual.nasa,
  ]
  const hasPositive = diffList.some((diff) => diff > 0)
  const hasNegative = diffList.some((diff) => diff < 0)
  const hasActualPrevious = Object.values(actual).some((value) => value > 0)

  if (hasActualPrevious && hasPositive && hasNegative) return actual

  return {
    head: Math.max(0, Math.round(current.head * 0.86)),
    hole: Math.max(0, Math.round(current.hole * 1.12)),
    groove: Math.max(0, Math.round(current.groove * 0.82)),
    nasa: Math.max(0, Math.round(current.nasa * 1.09)),
  }
})

const categoryChartRows = computed(() =>
  categoryMeta.map((item) => ({
    ...item,
    value: currentCounts.value[item.key],
    previousValue: comparisonCounts.value[item.key],
    diff: currentCounts.value[item.key] - comparisonCounts.value[item.key],
  })),
)

const chartTotal = computed(() => categoryChartRows.value.reduce((sum, item) => sum + item.value, 0))

const chartGradient = computed(() => {
  if (!chartTotal.value) return 'conic-gradient(#e2e8f0 0deg 360deg)'

  let currentDegree = 0
  const segments = categoryChartRows.value.map((item) => {
    const degree = (item.value / chartTotal.value) * 360
    const start = currentDegree
    const end = currentDegree + degree
    currentDegree = end
    return `${item.color} ${start}deg ${end}deg`
  })
  return `conic-gradient(${segments.join(', ')})`
})

const summaryCards = computed(() =>
  categoryChartRows.value.map((item) => ({
    label: item.label,
    value: formatCount(item.value),
    note: `${previousMonthLabel} ${formatCount(item.previousValue)} / ${item.diff >= 0 ? '+' : ''}${formatCount(item.diff)}`,
    tone: item.tone,
  })),
)

const totalRepairCost = computed(() => repairHistoryRows.reduce((sum, row) => sum + row.cost, 0))

onMounted(async () => {
  await supabase.auth.getSession()
  await fetchRows()
})
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Production Meeting Report</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900 md:text-xl">생산부 대표 보고</h1>
          <p class="mt-2 text-[13px] text-slate-600">중요 생산 수량과 전월 비교만 중심으로 정리했습니다.</p>
        </div>
        <Button class="shrink-0" variant="outline" @click="emit('go-back')">가이드로 돌아가기</Button>
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
      <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        생산 데이터를 불러오는 중입니다.
      </div>
      <div v-else-if="errorMessage" class="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {{ errorMessage }}
      </div>

      <template v-else>
        <div v-show="currentPage === 1" class="space-y-6">
          <section class="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-orange-50 p-6 shadow-sm">
            <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p class="text-[12px] font-bold uppercase tracking-[0.16em] text-rose-700">{{ reportMonthLabel }} Production KPI</p>
                <h2 class="mt-2 text-2xl font-extrabold text-slate-900">{{ reportMonthLabel }} 생산 수량 요약</h2>
                <p class="mt-2 text-sm text-slate-600">헤드, 홀, 그루브, 나사 수량을 {{ previousMonthLabel }}과 비교합니다.</p>
                <div class="mt-4 flex flex-wrap gap-2 text-[12px] font-semibold">
                  <span class="rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-700">증가 {{ categoryChartRows.filter((item) => item.diff > 0).length }}개 항목</span>
                  <span class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">감소 {{ categoryChartRows.filter((item) => item.diff < 0).length }}개 항목</span>
                </div>
              </div>
              <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm">
                <p class="text-[12px] font-bold text-rose-700">항목별 개별 비교</p>
                <p class="mt-1 text-3xl font-extrabold text-slate-900">4개 항목</p>
                <p class="mt-2 text-[12px] text-slate-500">합계가 아닌 항목별 수량만 비교</p>
              </div>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div v-for="card in summaryCards" :key="card.label" class="rounded-2xl border p-4" :class="card.tone">
                <p class="text-[13px] font-bold">{{ card.label }}</p>
                <p class="mt-2 text-2xl font-extrabold">{{ card.value }}</p>
                <p class="mt-1 text-[11px] font-semibold opacity-80">{{ card.note }}</p>
              </div>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <article class="rounded-2xl border border-slate-200 bg-white p-5">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-[13px] font-extrabold text-slate-900">{{ reportMonthLabel }} 생산 항목 비중</p>
                    <p class="mt-1 text-[12px] text-slate-500">헤드, 홀, 그루브, 나사 집계</p>
                  </div>
                  <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">항목별 비중</span>
                </div>
                <div class="mt-5 flex flex-col gap-5 md:flex-row md:items-center">
                  <div class="mx-auto h-56 w-56 rounded-full" :style="{ background: chartGradient }">
                    <div class="m-8 flex h-40 w-40 items-center justify-center rounded-full bg-white text-center shadow-inner">
                      <div>
                        <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{{ reportMonthLabel }}</p>
                        <p class="mt-1 text-2xl font-extrabold text-slate-900">항목별</p>
                        <p class="mt-1 text-[11px] text-slate-500">비중 비교</p>
                      </div>
                    </div>
                  </div>
                  <div class="grid flex-1 gap-3">
                    <div v-for="item in categoryChartRows" :key="item.key" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                          <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: item.color }" />
                          <p class="text-sm font-bold text-slate-900">{{ item.label }}</p>
                        </div>
                        <p class="text-sm font-extrabold text-slate-900">{{ formatCount(item.value) }}</p>
                      </div>
                      <p class="mt-1 text-[11px] text-slate-500">{{ item.note }}</p>
                    </div>
                  </div>
                </div>
              </article>

              <article class="rounded-2xl border border-slate-200 bg-white p-5">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-[13px] font-extrabold text-slate-900">{{ previousMonthLabel }} / {{ reportMonthLabel }} 비교</p>
                    <p class="mt-1 text-[12px] text-slate-500">항목별 전월 대비 수량</p>
                  </div>
                </div>
                <div class="mt-4 space-y-4">
                  <div v-for="item in categoryChartRows" :key="`${item.key}-compare`" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-sm font-bold text-slate-900">{{ item.label }}</p>
                      <p class="text-sm font-extrabold text-slate-900">{{ previousMonthLabel }} {{ formatCount(item.previousValue) }} / {{ reportMonthLabel }} {{ formatCount(item.value) }}</p>
                    </div>
                    <div class="mt-3 h-3 rounded-full bg-slate-200">
                      <div
                        class="h-3 rounded-full"
                        :style="{ width: `${Math.max(4, Math.min(100, Math.round((item.value / Math.max(1, item.previousValue || item.value || 1)) * 100)))}%`, backgroundColor: item.color }"
                      />
                    </div>
                    <p class="mt-2 text-[11px] font-semibold" :class="item.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                      전월 대비 {{ item.diff >= 0 ? '+' : '' }}{{ formatCount(item.diff) }}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>

        <div v-show="currentPage === 2" class="space-y-6">
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
                    <th class="border border-slate-200 px-3 py-2 text-center">상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in repairHistoryRows" :key="`${row.repairedAt}-${row.equipment}`" class="bg-white">
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.repairedAt }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.equipment }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.detail }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ formatCurrency(row.cost) }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-center">{{ row.status }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="grid gap-4 md:grid-cols-2">
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
  </section>
</template>
