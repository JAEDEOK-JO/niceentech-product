<script setup>
import { computed, onMounted } from 'vue'
import TotalReportBarChart from '@/features/management-guide/total-report/TotalReportBarChart.vue'
import { HALF_YEAR_IMPROVEMENT_ITEMS } from './halfYearImprovementNotes'
import { useProductionHalfYearData } from './useProductionHalfYearData'
import { buildSummaryCards, formatQty, formatRate } from './productionHalfYearAnalysis'

const {
  loading,
  errorMessage,
  periodLabel,
  monthlyRows,
  summary,
  canGoNext,
  movePeriod,
  fetchData,
} = useProductionHalfYearData()

onMounted(fetchData)

const summaryCards = computed(() => buildSummaryCards({ summary: summary.value }))
const improvementItems = HALF_YEAR_IMPROVEMENT_ITEMS

const productionChartGroups = computed(() =>
  monthlyRows.value.map((month) => ({
    label: month.label,
    bars: [
      {
        label: '생산',
        value: month.producedHeadQty,
        display: formatQty(month.producedHeadQty),
        color: '#6366f1',
      },
    ],
  })),
)

const drawingChartGroups = computed(() =>
  monthlyRows.value.map((month) => ({
    label: month.label,
    bars: [
      {
        label: '배포',
        value: month.drawingHeadQty,
        display: formatQty(month.drawingHeadQty),
        color: '#0ea5e9',
      },
      {
        label: '목요일12시이후',
        value: month.lateDrawingHeadQty,
        display: formatQty(month.lateDrawingHeadQty),
        color: '#f59e0b',
      },
    ],
  })),
)

const conversionChartGroups = computed(() =>
  monthlyRows.value.map((month) => ({
    label: month.label,
    bars: [
      {
        label: '배포',
        value: month.drawingHeadQty,
        display: formatQty(month.drawingHeadQty),
        color: '#0ea5e9',
      },
      {
        label: '생산완료',
        value: month.drawingProducedHeadQty,
        display: formatQty(month.drawingProducedHeadQty),
        color: '#6366f1',
      },
    ],
  })),
)

const cardToneClass = {
  indigo: 'border-indigo-200 bg-indigo-50/70',
  sky: 'border-sky-200 bg-sky-50/70',
  amber: 'border-amber-200 bg-amber-50/70',
  emerald: 'border-emerald-200 bg-emerald-50/70',
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
        불러오는 중...
      </div>
      <div v-else-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-600">
        {{ errorMessage }}
      </div>

      <template v-else>
        <section class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
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

        <section class="grid gap-3 lg:grid-cols-2">
          <TotalReportBarChart title="월별 생산량(검수일)" :groups="productionChartGroups" />
          <TotalReportBarChart title="월별 도면배포 · 목요일 12시 이후" :groups="drawingChartGroups" />
        </section>

        <section>
          <TotalReportBarChart title="당월배포 → 생산완료" :groups="conversionChartGroups" />
        </section>

        <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table class="w-full text-[12px]">
            <thead>
              <tr class="bg-slate-50 text-left text-[11px] font-extrabold text-slate-500">
                <th class="px-3 py-2">월</th>
                <th class="px-3 py-2 text-right">생산(검수)</th>
                <th class="px-3 py-2 text-right">도면(배포)</th>
                <th class="px-3 py-2 text-right">목요일12시이후</th>
                <th class="px-3 py-2 text-right">지연비중</th>
                <th class="px-3 py-2 text-right">당월배포 생산완료</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="month in monthlyRows"
                :key="month.key"
                class="border-t border-slate-100 font-bold text-slate-700"
              >
                <td class="px-3 py-2">{{ month.label }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(month.producedHeadQty) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(month.drawingHeadQty) }}</td>
                <td
                  class="px-3 py-2 text-right tabular-nums"
                  :class="month.lateDrawingHeadQty > 0 ? 'text-amber-600' : ''"
                >
                  {{ formatQty(month.lateDrawingHeadQty) }}
                </td>
                <td
                  class="px-3 py-2 text-right tabular-nums"
                  :class="month.lateDrawingRate >= 30 ? 'text-rose-600' : ''"
                >
                  {{ formatRate(month.lateDrawingRate) }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {{ formatQty(month.drawingProducedHeadQty) }}
                  <span class="text-[10px] text-slate-400">({{ formatRate(month.drawingConversionRate) }})</span>
                </td>
              </tr>
              <tr class="border-t-2 border-slate-200 bg-slate-50 font-extrabold text-slate-900">
                <td class="px-3 py-2">합계</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(summary.producedHeadQty) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(summary.drawingHeadQty) }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-amber-700">
                  {{ formatQty(summary.lateDrawingHeadQty) }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatRate(summary.lateDrawingRate) }} (평균)</td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {{ formatQty(summary.drawingProducedHeadQty) }}
                  <span class="text-[10px] font-bold text-slate-500">({{ formatRate(summary.drawingConversionRate) }})</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 class="text-base font-extrabold text-slate-900 sm:text-lg">개선사항 및 문제점</h2>
          <div class="mt-4 grid gap-3 lg:grid-cols-2">
            <div
              v-for="item in improvementItems"
              :key="item.key"
              class="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div class="flex items-center gap-2">
                <span
                  class="rounded-md px-2 py-0.5 text-[11px] font-extrabold"
                  :class="{
                    '개선됨': 'bg-emerald-100 text-emerald-700',
                    '요청': 'bg-rose-100 text-rose-700',
                    '건의': 'bg-amber-100 text-amber-700',
                    '개선 예정': 'bg-indigo-100 text-indigo-700',
                  }[item.type]"
                >
                  {{ item.type }}
                </span>
                <p class="text-sm font-extrabold text-slate-900 sm:text-[15px]">{{ item.title }}</p>
              </div>
              <p class="mt-2 text-[13px] font-semibold leading-relaxed text-slate-700 sm:text-sm">
                {{ item.body }}
              </p>
            </div>
          </div>
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
