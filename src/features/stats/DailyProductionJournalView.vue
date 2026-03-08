<script setup>
import Button from '@/components/ui/button/Button.vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  selectedDateText: { type: String, default: '' },
  selectedWeekday: { type: String, default: '' },
  selectedTestDateLabel: { type: String, default: '' },
  summary: { type: Object, required: true },
  processStats: { type: Array, default: () => [] },
  actualOvertimeInputMin: { type: Number, default: 0 },
  actualOvertimeNote: { type: String, default: '' },
  canEditActualOvertime: { type: Boolean, default: false },
})
const getCompletedBarWidth = (completedQty, targetQty) => {
  const safeCompleted = Math.max(0, Number(completedQty) || 0)
  const safeTarget = Math.max(1, Number(targetQty) || 0)
  if (safeCompleted <= 0) return '0%'
  const ratio = (safeCompleted / safeTarget) * 100
  return `${Math.max(4, Math.min(100, ratio))}%`
}
const getSummaryRatio = (part, total) => {
  const safePart = Math.max(0, Number(part) || 0)
  const safeTotal = Math.max(1, Number(total) || 0)
  return Math.round((safePart / safeTotal) * 100)
}
const getSummaryBarWidth = (part, total) => `${Math.max(4, Math.min(100, getSummaryRatio(part, total)))}%`

const emit = defineEmits([
  'go-home',
  'refresh',
  'move-day',
  'reset-today',
  'update:actualOvertimeInputMin',
  'update:actualOvertimeNote',
  'save-daily-actual',
])
</script>

<template>
  <section class="min-h-screen w-full bg-slate-50">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div class="flex items-start justify-between gap-3 px-4 py-3 md:px-6">
        <div class="min-w-0 flex-1">
          <h1 class="text-base font-bold text-slate-900 md:text-xl">
            {{ selectedDateText }} ({{ selectedWeekday }})
            <span class="text-orange-600">일일 생산일지</span>
          </h1>
          <p class="mt-1 text-xs text-slate-500">검수일 : {{ selectedTestDateLabel }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            class="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:h-10 md:w-10"
            @click="emit('move-day', -1)"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span class="sr-only">지난일</span>
          </button>
          <button
            type="button"
            class="relative flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 md:h-10 md:w-10"
            @click="emit('reset-today')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h18" />
            </svg>
            <span class="sr-only">오늘</span>
          </button>
          <button
            type="button"
            class="relative flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 md:h-10 md:w-10"
            @click="emit('refresh')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            <span class="sr-only">새로고침</span>
          </button>
          <button
            type="button"
            class="relative flex h-9 w-9 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 md:h-10 md:w-10"
            @click="emit('go-home')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M5 10.5V20h14v-9.5" />
            </svg>
            <span class="sr-only">홈</span>
          </button>
        </div>
      </div>
    </header>

    <div class="space-y-4 px-4 py-4 md:px-6">
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div class="rounded-xl border border-emerald-200 bg-white p-3">
          <p class="text-[11px] font-bold text-emerald-700">헤드</p>
          <p class="mt-2 text-sm font-extrabold text-slate-900">
            배포수({{ summary.distributedHead }}) / 전체수({{ summary.totalHead }})
          </p>
          <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
              :style="{ width: getSummaryBarWidth(summary.distributedHead, summary.totalHead) }"
            />
          </div>
          <p class="mt-2 text-right text-xs font-extrabold text-emerald-700">
            {{ getSummaryRatio(summary.distributedHead, summary.totalHead) }}%
          </p>
        </div>
        <div class="rounded-xl border border-cyan-200 bg-white p-3">
          <p class="text-[11px] font-bold text-cyan-700">홀</p>
          <p class="mt-2 text-sm font-extrabold text-slate-900">
            배포수({{ summary.distributedHole }}) / 전체수({{ summary.totalHole }})
          </p>
          <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all"
              :style="{ width: getSummaryBarWidth(summary.distributedHole, summary.totalHole) }"
            />
          </div>
          <p class="mt-2 text-right text-xs font-extrabold text-cyan-700">
            {{ getSummaryRatio(summary.distributedHole, summary.totalHole) }}%
          </p>
        </div>
        <div class="rounded-xl border border-indigo-200 bg-white p-3 sm:hidden">
          <p class="text-[11px] font-bold text-indigo-700">오늘 작업</p>
          <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-lg bg-indigo-50 px-3 py-2">
              <p class="text-[11px] font-bold text-indigo-700">추정</p>
              <p class="mt-1 font-extrabold text-slate-900">{{ summary.dayEstimatedQty }}</p>
            </div>
            <div class="rounded-lg bg-sky-50 px-3 py-2">
              <p class="text-[11px] font-bold text-sky-700">완료</p>
              <p class="mt-1 font-extrabold text-slate-900">{{ summary.dayDoneQty }}</p>
            </div>
          </div>
          <p class="mt-2 text-[11px] text-slate-500">총 헤드수/홀수 ÷ 소요일 기준</p>
        </div>
        <div class="hidden rounded-xl border border-indigo-200 bg-white p-3 sm:block">
          <p class="text-[11px] font-bold text-indigo-700">오늘 추정 헤드수/홀수</p>
          <p class="mt-1 text-sm font-extrabold text-slate-900">{{ summary.dayEstimatedQty }}</p>
          <p class="mt-1 text-[11px] text-slate-500">총 헤드수/홀수 ÷ 소요일</p>
        </div>
        <div class="hidden rounded-xl border border-sky-200 bg-white p-3 sm:block">
          <p class="text-[11px] font-bold text-sky-700">오늘 완료 헤드수/홀수</p>
          <p class="mt-1 text-sm font-extrabold text-slate-900">{{ summary.dayDoneQty }}</p>
        </div>
        <div class="rounded-xl border border-fuchsia-200 bg-white p-3">
          <p class="text-[11px] font-bold text-fuchsia-700">야근 현황</p>
          <div class="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div class="rounded-lg bg-fuchsia-50 px-2 py-2">
              <p class="text-[11px] font-bold text-fuchsia-700">자동</p>
              <p class="mt-1 font-extrabold text-slate-900">{{ summary.autoOvertimeText }}</p>
            </div>
            <div class="rounded-lg bg-rose-50 px-2 py-2">
              <p class="text-[11px] font-bold text-rose-700">실제</p>
              <p class="mt-1 font-extrabold text-slate-900">{{ summary.actualOvertimeText }}</p>
            </div>
            <div class="rounded-lg bg-violet-50 px-2 py-2">
              <p class="text-[11px] font-bold text-violet-700">달성률</p>
              <p class="mt-1 font-extrabold text-slate-900">{{ summary.overtimeAchievementRateText }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="canEditActualOvertime" class="rounded-xl border border-slate-200 bg-white p-3">
        <p class="mb-2 text-xs font-bold text-slate-600">실제 야근 입력(분)</p>
        <div class="grid gap-2 md:grid-cols-[120px_1fr_auto]">
          <input
            :value="actualOvertimeInputMin"
            type="number"
            min="0"
            step="1"
            class="h-9 rounded-md border border-slate-300 px-2 text-sm text-right"
            @input="emit('update:actualOvertimeInputMin', Number($event.target.value || 0))"
          />
          <input
            :value="actualOvertimeNote"
            type="text"
            class="h-9 rounded-md border border-slate-300 px-2 text-sm"
            placeholder="메모"
            @input="emit('update:actualOvertimeNote', $event.target.value)"
          />
          <Button class="h-9 px-3 text-xs" @click="emit('save-daily-actual')">저장</Button>
        </div>
      </div>

      <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        일지 로딩 중...
      </div>
      <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {{ error }}
      </div>
      <div v-else class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-slate-900">공정 묶음 현황</h2>
            <p class="text-xs text-slate-500">표로 비교하고, 완료율은 얇은 진행 바로 보조 표시합니다.</p>
          </div>
        </div>
        <div v-if="processStats.length > 0" class="space-y-3 md:hidden">
          <article
            v-for="row in processStats"
            :key="`${row.key}-mobile`"
            class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-extrabold text-slate-900">{{ row.label }}</h3>
                <p v-if="row.subLabel" class="mt-0.5 text-[11px] font-semibold text-slate-500">{{ row.subLabel }}</p>
                <p class="mt-1 text-[11px] text-slate-500">{{ row.totalLabel }} {{ row.targetQty }}</p>
              </div>
              <div class="text-right">
                <p class="text-[11px] font-bold text-slate-500">{{ row.remainingLabel }}</p>
                <p class="mt-1 text-xl font-extrabold text-rose-600">{{ row.remainingQty }}</p>
              </div>
            </div>
            <div class="mt-3">
              <div class="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>완료율</span>
                <span>{{ row.completionRate }}%</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all"
                  :style="{ width: getCompletedBarWidth(row.completedQty, row.targetQty) }"
                />
              </div>
            </div>
            <div class="mt-3 grid grid-cols-4 gap-2 text-center">
              <div class="rounded-xl bg-white px-3 py-2">
                <p class="text-[11px] font-bold text-slate-500">오늘 추정</p>
                <p class="mt-1 text-sm font-extrabold text-emerald-700">{{ row.estimatedTodayQty }}</p>
              </div>
              <div class="rounded-xl bg-white px-3 py-2">
                <p class="text-[11px] font-bold text-slate-500">오늘 완료</p>
                <p class="mt-1 text-sm font-extrabold text-sky-700">{{ row.completedTodayQty }}</p>
              </div>
              <div class="rounded-xl bg-white px-3 py-2">
                <p class="text-[11px] font-bold text-slate-500">{{ row.totalLabel }}</p>
                <p class="mt-1 text-sm font-extrabold text-slate-900">{{ row.targetQty }}</p>
              </div>
              <div class="rounded-xl bg-white px-3 py-2">
                <p class="text-[11px] font-bold text-slate-500">평균 소요일</p>
                <p class="mt-1 text-sm font-extrabold text-violet-700">{{ row.avgLeadDaysText }}</p>
              </div>
            </div>
          </article>
        </div>
        <div v-if="processStats.length > 0" class="hidden overflow-x-auto md:block">
          <table class="min-w-[760px] w-full border-collapse">
            <thead class="bg-slate-100">
              <tr>
                <th class="border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700">공정</th>
                <th class="border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700">총 헤드수/총 홀수</th>
                <th class="border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700">오늘 추정</th>
                <th class="border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700">오늘 완료</th>
                <th class="border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700">남은 헤드수/남은 홀수</th>
                <th class="border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700">평균 소요일</th>
                <th class="border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700">완료율</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in processStats" :key="row.key" class="bg-white">
                <td class="border border-slate-200 px-3 py-3 text-center text-sm font-bold text-slate-900">
                  <div>{{ row.label }}</div>
                  <div v-if="row.subLabel" class="mt-0.5 text-[11px] font-semibold text-slate-500">{{ row.subLabel }}</div>
                </td>
                <td class="border border-slate-200 px-3 py-3 text-center text-sm text-slate-700">
                  <div class="font-semibold">{{ row.targetQty }}</div>
                  <div class="mt-1 text-[11px] text-slate-500">{{ row.totalLabel }}</div>
                </td>
                <td class="border border-slate-200 px-3 py-3 text-center text-sm font-extrabold text-emerald-700">{{ row.estimatedTodayQty }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-sm font-extrabold text-sky-700">{{ row.completedTodayQty }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-sm">
                  <div class="font-extrabold text-rose-600">{{ row.remainingQty }}</div>
                  <div class="mt-1 text-[11px] text-slate-500">{{ row.remainingLabel }}</div>
                </td>
                <td class="border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-violet-700">{{ row.avgLeadDaysText }}</td>
                <td class="border border-slate-200 px-3 py-3 text-sm">
                  <div class="flex items-center gap-3">
                    <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all"
                        :style="{ width: getCompletedBarWidth(row.completedQty, row.targetQty) }"
                      />
                    </div>
                    <span class="w-12 text-right text-xs font-extrabold text-slate-700">{{ row.completionRate }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="rounded-xl border border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500">
          집계 데이터가 없습니다.
        </div>
      </div>
    </div>
  </section>
</template>

