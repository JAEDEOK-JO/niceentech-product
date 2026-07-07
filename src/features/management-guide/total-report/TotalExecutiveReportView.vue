<script setup>
import { computed, onMounted } from 'vue'
import { useTotalReportData } from './useTotalReportData'
import TotalReportBarChart from './TotalReportBarChart.vue'
import {
  MONTHLY_SALES_TARGET,
  HEAD_UNIT_PRICE,
  INCH_TO_HEAD_RATIO,
  formatMoneyAmount,
  buildMonthComparisons,
  buildValueChain,
  buildDetailedAnalysis,
  buildTargetSimulation,
  buildConclusion,
  formatChangeRate,
} from './totalReportAnalysis'

defineProps({
  showBackButton: { type: Boolean, default: true },
})

const {
  loading,
  errorMessage,
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
} = useTotalReportData()

const formatBillion = formatMoneyAmount
const formatHead = (value) => `${Number(value || 0).toLocaleString('ko-KR')}개`
const formatTon = (value) => `${Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}톤`
const unshippedValue = computed(() => {
  const backlog = unshippedBacklog.value
  if (!backlog) return 0
  const workQty = Number(backlog.headQty || 0) + Number(backlog.inchQty || 0) * INCH_TO_HEAD_RATIO
  return workQty * HEAD_UNIT_PRICE
})

const periodLabel = computed(() => {
  const list = monthlyMetrics.value
  if (list.length === 0) return quarterLabel.value
  return `${quarterLabel.value} (${list[0].label}~${list[list.length - 1].label})`
})
const comparisons = computed(() => buildMonthComparisons(monthlyMetrics.value, currentMonthMetrics.value))
const valueChain = computed(() => buildValueChain(monthlyMetrics.value))
const analysisGroups = computed(() =>
  buildDetailedAnalysis(monthlyMetrics.value, valueChain.value, expectedOrders.value, unshippedBacklog.value),
)
const simulation = computed(() => buildTargetSimulation(monthlyMetrics.value))
const conclusion = computed(() =>
  buildConclusion(
    monthlyMetrics.value,
    valueChain.value,
    expectedOrders.value,
    simulation.value,
    unshippedBacklog.value,
    isLatestQuarter.value,
  ),
)

const salesChartGroups = computed(() =>
  monthlyMetrics.value.map((month) => ({
    label: month.label,
    bars: [
      {
        label: '매출',
        value: month.salesAmount,
        display: formatBillion(month.salesAmount),
        color: month.salesAmount >= MONTHLY_SALES_TARGET ? '#4f46e5' : '#818cf8',
      },
    ],
  })),
)

// 차트는 인치 환산 없이 실제 헤드 수만 표시한다. (분석은 인치 환산 작업량 사용)
const workChartGroups = computed(() =>
  monthlyMetrics.value.map((month) => ({
    label: month.label,
    bars: [
      {
        label: '수주',
        value: month.orderHeadQty,
        display: Number(month.orderHeadQty).toLocaleString('ko-KR'),
        color: '#6366f1',
      },
      {
        label: '도면배포',
        value: month.drawingTotalHeadQty,
        display: Number(month.drawingTotalHeadQty || 0).toLocaleString('ko-KR'),
        color: '#10b981',
      },
      {
        label: '생산완료',
        value: month.productionTotalHeadQty,
        display: Number(month.productionTotalHeadQty || 0).toLocaleString('ko-KR'),
        color: '#f43f5e',
      },
    ],
  })),
)

const inventoryChartGroups = computed(() =>
  monthlyMetrics.value.map((month) => ({
    label: month.label,
    bars: [
      {
        label: '입고',
        value: month.receivedTon,
        display: formatTon(month.receivedTon),
        color: '#0ea5e9',
      },
      {
        label: '사용',
        value: month.usedTon,
        display: formatTon(month.usedTon),
        color: '#f59e0b',
      },
    ],
  })),
)

const comparisonMetricDefs = [
  { key: 'order', label: '수주' },
  { key: 'sales', label: '매출' },
  { key: 'drawing', label: '도면배포' },
  { key: 'received', label: '입고' },
  { key: 'production', label: '생산' },
]

const changeToneClass = (rate) => {
  if (rate === null) return 'text-slate-400'
  if (rate >= 5) return 'text-emerald-700'
  if (rate <= -5) return 'text-rose-700'
  return 'text-slate-600'
}

const insightToneClasses = {
  good: 'border-emerald-200 bg-emerald-50',
  bad: 'border-rose-200 bg-rose-50',
  warn: 'border-amber-200 bg-amber-50',
  info: 'border-sky-200 bg-sky-50',
}
const insightTitleClasses = {
  good: 'text-emerald-800',
  bad: 'text-rose-800',
  warn: 'text-amber-800',
  info: 'text-sky-800',
}
const insightIcons = {
  good: '▲',
  bad: '▼',
  warn: '!',
  info: 'i',
}
const insightIconClasses = {
  good: 'bg-emerald-100 text-emerald-700',
  bad: 'bg-rose-100 text-rose-700',
  warn: 'bg-amber-100 text-amber-700',
  info: 'bg-sky-100 text-sky-700',
}

const simulationCards = computed(() => {
  if (!simulation.value) return []
  return [
    {
      key: 'sales',
      department: '영업부',
      tone: 'border-indigo-200 bg-indigo-50',
      valueClass: 'text-indigo-800',
      mainLabel: '월 매출',
      mainValue: formatBillion(MONTHLY_SALES_TARGET),
      subLabel: '필요 신규 수주',
      subValue: formatHead(simulation.value.requiredOrderHead),
    },
    {
      key: 'design',
      department: '설계부',
      tone: 'border-emerald-200 bg-emerald-50',
      valueClass: 'text-emerald-800',
      mainLabel: '월 도면배포',
      mainValue: formatHead(simulation.value.requiredDrawingHead),
      subLabel: '주간 환산',
      subValue: formatHead(simulation.value.requiredWeeklyDrawingHead),
    },
    {
      key: 'operations',
      department: '공무부',
      tone: 'border-amber-200 bg-amber-50',
      valueClass: 'text-amber-800',
      mainLabel: '월 입고',
      mainValue: `${formatTon(simulation.value.requiredReceivedTon)} 이상`,
      subLabel: '예상 사용',
      subValue: formatTon(simulation.value.requiredUsedTon),
    },
    {
      key: 'production',
      department: '생산부',
      tone: 'border-rose-200 bg-rose-50',
      valueClass: 'text-rose-800',
      mainLabel: '월 생산',
      mainValue: formatHead(simulation.value.requiredProductionHead),
      subLabel: '주간 환산',
      subValue: formatHead(simulation.value.requiredWeeklyProductionHead),
    },
  ]
})

onMounted(fetchTotalReportData)
</script>

<template>
  <section class="report-root min-h-screen bg-slate-100">
    <main class="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        총보고서 데이터를 불러오는 중입니다.
      </div>
      <div v-else-if="errorMessage" class="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {{ errorMessage }}
      </div>

      <div v-else class="space-y-6">
        <section class="rounded-3xl border border-slate-300 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-6 shadow-sm">
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p class="text-[12px] font-bold text-slate-500">{{ periodLabel }} 종합</p>
              <h2 class="mt-2 text-2xl font-extrabold text-slate-900">총 보고서</h2>
              <div class="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  :disabled="loading"
                  @click="moveQuarter(-1)"
                >
                  이전 분기
                </button>
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  :disabled="loading || !canGoNextQuarter"
                  @click="moveQuarter(1)"
                >
                  다음 분기
                </button>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm">
                <p class="text-[12px] font-bold text-indigo-700">월 매출 목표</p>
                <p class="mt-1 text-2xl font-extrabold text-slate-900">{{ formatBillion(MONTHLY_SALES_TARGET) }}</p>
              </div>
              <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm">
                <p class="text-[12px] font-bold text-emerald-700">수주 예정(전체기간)</p>
                <p class="mt-1 text-2xl font-extrabold text-slate-900">{{ formatHead(expectedOrders?.totalHeadQty ?? 0) }}</p>
              </div>
              <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm">
                <p class="text-[12px] font-bold text-orange-700">총 잔고</p>
                <p class="mt-1 text-2xl font-extrabold text-slate-900">{{ formatTon(totalBalanceTon) }}</p>
              </div>
              <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm">
                <p class="text-[12px] font-bold text-rose-700">미출하</p>
                <p class="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl">
                  {{ formatHead(unshippedBacklog?.totalHeadQty ?? 0) }}
                  <span class="text-lg text-slate-700 md:text-xl">({{ formatBillion(unshippedValue) }})</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          v-if="conclusion"
          class="rounded-3xl border-2 p-5 shadow-sm md:p-6"
          :class="insightToneClasses[conclusion.tone]"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-extrabold"
              :class="insightIconClasses[conclusion.tone]"
            >
              {{ insightIcons[conclusion.tone] }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[12px] font-bold text-slate-500">결론</p>
              <p class="mt-1 text-base font-extrabold md:text-lg" :class="insightTitleClasses[conclusion.tone]">
                {{ conclusion.headline }}
              </p>
              <div class="mt-3 grid gap-3 md:grid-cols-2">
                <div class="rounded-2xl border border-white bg-white/80 p-3.5">
                  <p class="text-[12px] font-extrabold text-slate-500">원인</p>
                  <ul class="mt-1.5 space-y-1.5">
                    <li
                      v-for="(cause, index) in conclusion.causes"
                      :key="index"
                      class="flex gap-1.5 text-[13px] leading-relaxed text-slate-800"
                    >
                      <span class="shrink-0 font-extrabold text-slate-400">·</span>
                      <span>{{ cause }}</span>
                    </li>
                  </ul>
                </div>
                <div class="rounded-2xl border border-white bg-white/80 p-3.5">
                  <p class="text-[12px] font-extrabold text-slate-500">해야 할 일</p>
                  <ul class="mt-1.5 space-y-1.5">
                    <li
                      v-for="(action, index) in conclusion.actions"
                      :key="index"
                      class="flex gap-1.5 text-[13px] leading-relaxed text-slate-800"
                    >
                      <span class="shrink-0 font-extrabold text-slate-400">·</span>
                      <span>{{ action }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p class="text-[13px] font-extrabold text-slate-900">월별 추이</p>
          <div class="mt-4 grid min-w-0 gap-3 lg:grid-cols-[1fr_1.4fr_1fr] lg:gap-4">
            <TotalReportBarChart
              title="매출"
              :groups="salesChartGroups"
              :target-value="MONTHLY_SALES_TARGET"
              :target-label="`목표 ${formatBillion(MONTHLY_SALES_TARGET)}`"
              anchor-scale-to-target
            />
            <TotalReportBarChart title="수주 · 도면배포 · 생산 (헤드)" :groups="workChartGroups" />
            <TotalReportBarChart title="입고 · 사용 (톤)" :groups="inventoryChartGroups" />
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p class="text-[13px] font-extrabold text-slate-900">종합 분석</p>
          <div v-if="analysisGroups.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            분석할 데이터가 부족합니다.
          </div>
          <div v-else class="mt-4 space-y-6">
            <div v-for="group in analysisGroups" :key="group.heading">
              <p class="mb-3 text-sm font-extrabold text-slate-700">{{ group.heading }}</p>
              <div class="space-y-3">
                <div
                  v-for="(insight, index) in group.items"
                  :key="index"
                  class="flex gap-3 rounded-2xl border p-4"
                  :class="insightToneClasses[insight.tone]"
                >
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                    :class="insightIconClasses[insight.tone]"
                  >
                    {{ insightIcons[insight.tone] }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-extrabold" :class="insightTitleClasses[insight.tone]">{{ insight.title }}</p>
                    <div v-if="insight.facts?.length" class="mt-2 flex flex-wrap gap-1.5">
                      <span
                        v-for="fact in insight.facts"
                        :key="fact.label"
                        class="inline-flex items-center gap-1.5 rounded-lg border border-white bg-white/80 px-2.5 py-1 text-[12px]"
                      >
                        <span class="font-semibold text-slate-500">{{ fact.label }}</span>
                        <span class="font-extrabold text-slate-900">{{ fact.value }}</span>
                      </span>
                    </div>
                    <p v-if="insight.detail" class="mt-2 text-[13px] leading-relaxed text-slate-700">{{ insight.detail }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p class="text-[13px] font-extrabold text-slate-900">전월 대비 증감</p>
          <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div v-for="comparison in comparisons" :key="comparison.key" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-sm font-extrabold text-slate-900">{{ comparison.label }}</p>
              <div class="mt-3 grid grid-cols-5 gap-2">
                <div v-for="def in comparisonMetricDefs" :key="def.key" class="rounded-xl bg-white px-2 py-2.5 text-center">
                  <p class="text-[11px] font-bold text-slate-500">{{ def.label }}</p>
                  <p class="mt-1 text-sm font-extrabold" :class="changeToneClass(comparison[def.key])">
                    {{ formatChangeRate(comparison[def.key]) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[13px] font-extrabold text-slate-900">목표 {{ formatBillion(MONTHLY_SALES_TARGET) }} 달성 기준</p>
            <p v-if="simulation" class="text-[12px] text-slate-500">헤드당 15,000원 · {{ simulation.baseMonthLabels }} 실적 기준</p>
          </div>
          <div v-if="!simulation" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            시뮬레이션에 필요한 매출·생산 데이터가 부족합니다.
          </div>
          <div v-else class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div v-for="card in simulationCards" :key="card.key" class="rounded-2xl border p-4" :class="card.tone">
              <p class="text-sm font-extrabold text-slate-900">{{ card.department }}</p>
              <p class="mt-3 text-[11px] font-bold text-slate-500">{{ card.mainLabel }}</p>
              <p class="text-xl font-extrabold" :class="card.valueClass">{{ card.mainValue }}</p>
              <p class="mt-2 text-[11px] font-bold text-slate-500">{{ card.subLabel }}</p>
              <p class="text-sm font-extrabold text-slate-700">{{ card.subValue }}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </section>
</template>
