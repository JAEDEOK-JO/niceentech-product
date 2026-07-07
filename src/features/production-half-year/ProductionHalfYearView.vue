<script setup>
import { computed, onMounted } from 'vue'
import TotalReportBarChart from '@/features/management-guide/total-report/TotalReportBarChart.vue'
import { useProductionHalfYearData } from './useProductionHalfYearData'
import {
  buildSummaryCards,
  buildReview,
  buildOutlook,
  formatHeadQty,
  formatRate,
} from './productionHalfYearAnalysis'

const {
  year,
  half,
  loading,
  errorMessage,
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
} = useProductionHalfYearData()

onMounted(fetchData)

const formatQty = (value) => Math.round(Number(value) || 0).toLocaleString('ko-KR')

const summaryCards = computed(() =>
  buildSummaryCards({
    summary: summary.value,
    shipmentSummary: shipmentSummary.value,
    drawingSummary: drawingSummary.value,
  }),
)

const review = computed(() =>
  buildReview({
    summary: summary.value,
    monthlyProduction: monthlyProduction.value,
    shipmentSummary: shipmentSummary.value,
    drawingSummary: drawingSummary.value,
    periodLabel: periodLabel.value,
  }),
)

const outlook = computed(() =>
  buildOutlook({
    summary: summary.value,
    shipmentSummary: shipmentSummary.value,
    year: year.value,
    half: half.value,
  }),
)

const productionChartGroups = computed(() =>
  monthlyProduction.value.map((month) => ({
    label: month.label,
    bars: [
      {
        label: '생산',
        value: month.totalHeadQty,
        display: formatQty(month.totalHeadQty),
        color: '#6366f1',
        tooltip:
          month.inchQty > 0
            ? `${month.label} 생산: ${formatQty(month.totalHeadQty)}헤드 (${formatQty(month.inchQty)}인치 작업 포함)`
            : `${month.label} 생산: ${formatQty(month.totalHeadQty)}헤드`,
      },
    ],
  })),
)

const shipmentChartGroups = computed(() =>
  monthlyProduction.value.map((month) => ({
    label: month.label,
    bars: [
      {
        label: '출하완료',
        value: month.shippedHeadQty,
        display: formatQty(month.shippedHeadQty),
        color: '#10b981',
      },
      {
        label: '미출하',
        value: month.unshippedHeadQty,
        display: formatQty(month.unshippedHeadQty),
        color: '#f43f5e',
      },
    ],
  })),
)

const workTypeMax = computed(() =>
  Math.max(...workTypeBreakdown.value.map((item) => item.totalHeadQty), 1),
)
const processMax = computed(() =>
  Math.max(...processMetrics.value.map((item) => item.totalHeadQty), 1),
)

const cardToneClass = {
  indigo: 'border-indigo-200 bg-indigo-50/70',
  sky: 'border-sky-200 bg-sky-50/70',
  emerald: 'border-emerald-200 bg-emerald-50/70',
  amber: 'border-amber-200 bg-amber-50/70',
  violet: 'border-violet-200 bg-violet-50/70',
}

const printPage = () => window.print()
</script>

<template>
  <div class="production-half-year-root min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-6">
    <div class="mx-auto max-w-6xl space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-lg font-extrabold text-slate-900 sm:text-xl">생산부 반기 결산</h1>
          <p class="text-sm font-bold text-indigo-600">{{ periodLabel }}</p>
        </div>
        <div class="print-hidden flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            @click="movePeriod(-1)"
          >
            이전 반기
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canGoNext"
            @click="movePeriod(1)"
          >
            다음 반기
          </button>
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
            @click="printPage"
          >
            인쇄
          </button>
        </div>
      </header>

      <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500">
        데이터를 불러오는 중...
      </div>
      <div v-else-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-600">
        {{ errorMessage }}
      </div>

      <template v-else>
        <!-- 결산 요약 카드 -->
        <section class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
          <div
            v-for="card in summaryCards"
            :key="card.key"
            class="rounded-2xl border p-3 sm:p-4"
            :class="cardToneClass[card.tone]"
          >
            <p class="text-[11px] font-bold text-slate-500">{{ card.label }}</p>
            <p class="mt-1 text-sm font-extrabold text-slate-900 sm:text-base">{{ card.value }}</p>
            <p v-if="card.sub" class="mt-0.5 text-[10px] font-bold text-slate-500">{{ card.sub }}</p>
          </div>
        </section>

        <!-- 총평 -->
        <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 class="text-sm font-extrabold text-slate-900">총평</h2>
          <p class="mt-2 rounded-xl bg-indigo-50 p-3 text-[13px] font-bold leading-relaxed text-indigo-900">
            {{ review.headline }}
          </p>
          <ul class="mt-3 space-y-2">
            <li v-for="item in review.items" :key="item.key" class="flex gap-2 text-[12px] leading-relaxed">
              <span class="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-600">
                {{ item.title }}
              </span>
              <span class="font-semibold text-slate-700">{{ item.text }}</span>
            </li>
          </ul>
        </section>

        <!-- 월별 추이 -->
        <section class="grid gap-3 lg:grid-cols-2">
          <TotalReportBarChart title="월별 생산량 (헤드)" :groups="productionChartGroups" />
          <TotalReportBarChart title="월별 출하 · 미출하 (헤드)" :groups="shipmentChartGroups" />
        </section>

        <!-- 월별 상세 표 -->
        <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table class="w-full text-[12px]">
            <thead>
              <tr class="bg-slate-50 text-left text-[11px] font-extrabold text-slate-500">
                <th class="px-3 py-2">월</th>
                <th class="px-3 py-2 text-right">현장 수</th>
                <th class="px-3 py-2 text-right">생산 헤드</th>
                <th class="px-3 py-2 text-right">인치 작업</th>
                <th class="px-3 py-2 text-right">출하완료</th>
                <th class="px-3 py-2 text-right">미출하</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="month in monthlyProduction"
                :key="month.key"
                class="border-t border-slate-100 font-bold text-slate-700"
              >
                <td class="px-3 py-2">{{ month.label }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(month.siteCount) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(month.totalHeadQty) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ month.inchQty > 0 ? formatQty(month.inchQty) : '-' }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-emerald-600">{{ formatQty(month.shippedHeadQty) }}</td>
                <td class="px-3 py-2 text-right tabular-nums" :class="month.unshippedHeadQty > 0 ? 'text-rose-600' : ''">
                  {{ formatQty(month.unshippedHeadQty) }}
                </td>
              </tr>
              <tr class="border-t-2 border-slate-200 bg-slate-50 font-extrabold text-slate-900">
                <td class="px-3 py-2">합계</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(summary.siteCount) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(summary.totalHeadQty) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ summary.inchQty > 0 ? formatQty(summary.inchQty) : '-' }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-emerald-700">{{ formatQty(shipmentSummary.shippedHeadQty) }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-rose-600">{{ formatQty(shipmentSummary.unshippedHeadQty) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 작업 유형 · 공정별 -->
        <section class="grid gap-3 lg:grid-cols-2">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 class="text-sm font-extrabold text-slate-900">작업 유형별 실적</h2>
            <div class="mt-3 space-y-2.5">
              <div v-for="item in workTypeBreakdown" :key="item.label">
                <div class="flex items-center justify-between text-[12px] font-bold text-slate-700">
                  <span>{{ item.label }}</span>
                  <span class="tabular-nums">
                    {{ formatQty(item.totalHeadQty) }}헤드 · {{ formatQty(item.siteCount) }}개 현장
                  </span>
                </div>
                <div class="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="h-full rounded-full bg-indigo-500"
                    :style="{ width: `${(item.totalHeadQty / workTypeMax) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 class="text-sm font-extrabold text-slate-900">공정별 완료 물량</h2>
            <div class="mt-3 space-y-2.5">
              <div v-for="item in processMetrics" :key="item.key">
                <div class="flex items-center justify-between text-[12px] font-bold text-slate-700">
                  <span>{{ item.label }}</span>
                  <span class="tabular-nums">
                    {{ formatQty(item.totalHeadQty) }}헤드 · {{ formatQty(item.siteCount) }}개 현장
                  </span>
                </div>
                <div class="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="h-full rounded-full bg-emerald-500"
                    :style="{ width: `${(item.totalHeadQty / processMax) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 도면배포 대비 소화율 -->
        <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 class="text-sm font-extrabold text-slate-900">도면배포 대비 생산 소화율</h2>
          <div class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] font-bold text-slate-700">
            <span>배포 {{ formatHeadQty(drawingSummary.totalHeadQty) }} ({{ formatQty(drawingSummary.siteCount) }}개 현장)</span>
            <span>생산 {{ formatHeadQty(drawingSummary.producedHead) }}</span>
            <span class="text-indigo-600">소화율 {{ formatRate(drawingSummary.conversionRate) }}</span>
          </div>
          <div class="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full rounded-full"
              :class="drawingSummary.conversionRate >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'"
              :style="{ width: `${Math.min(drawingSummary.conversionRate, 100)}%` }"
            />
          </div>
        </section>

        <!-- 다음 반기 전망 -->
        <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 class="text-sm font-extrabold text-slate-900">{{ outlook.nextLabel }} 전망</h2>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <div
              v-for="row in outlook.rows"
              :key="row.key"
              class="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <p class="text-[11px] font-bold text-slate-500">{{ row.label }}</p>
              <p class="mt-1 text-sm font-extrabold text-slate-900">{{ row.value }}</p>
            </div>
          </div>
          <p v-if="outlook.note" class="mt-3 text-[12px] font-semibold text-slate-600">{{ outlook.note }}</p>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .production-half-year-root {
    min-height: auto;
    background: #fff;
    padding: 0;
  }

  .production-half-year-root > div {
    max-width: none;
  }

  .print-hidden {
    display: none !important;
  }
}
</style>
