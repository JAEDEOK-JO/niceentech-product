<script setup>
import Button from '@/components/ui/button/Button.vue'

defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  selectedDateText: { type: String, default: '' },
  selectedWeekday: { type: String, default: '' },
  selectedTestDateLabel: { type: String, default: '' },
  selectedDateOptions: { type: Array, default: () => [] },
  canMoveNextDay: { type: Boolean, default: false },
  summary: { type: Object, required: true },
  weekdayPlanRows: { type: Array, default: () => [] },
  lineInputs: { type: Object, required: true },
  canEditActualOvertime: { type: Boolean, default: false },
})

const emit = defineEmits([
  'go-home',
  'refresh',
  'move-day',
  'reset-today',
  'update:selected-input-date',
  'update:is-no-overtime-checked',
  'update:actualOvertimeInputMin',
  'update:actualOvertimeNote',
  'update:delayInputMin',
  'update:delayReason',
  'save-daily-actual',
])
</script>

<template>
  <section class="min-h-screen w-full bg-slate-50">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div class="flex flex-col gap-3 px-4 py-3 md:px-6">
        <div class="min-w-0 flex-1">
          <h1 class="text-lg font-extrabold text-slate-900 md:text-2xl">
            <span class="text-orange-600">주간 생산 계산</span>
          </h1>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 font-semibold text-orange-700">
              입력 기준일 {{ selectedDateText }} ({{ selectedWeekday }})
            </span>
            <span class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-semibold text-sky-700">
              검수일 {{ selectedTestDateLabel }}
            </span>
            <span
              v-for="line in summary.lines"
              :key="`${line.key}-badge`"
              class="rounded-full px-3 py-1 font-semibold"
              :class="
                line.accent === 'emerald'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-cyan-200 bg-cyan-50 text-cyan-700'
              "
            >
              {{ line.title }} {{ line.quantityLabel }} {{ line.totalQtyText }}
            </span>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-600">
              기준 주차 {{ summary.weekRangeText }}
            </span>
            <span class="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-medium text-violet-700">
              마감 {{ summary.deadlineText }}
            </span>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              @click="emit('move-day', -1)"
            >
              지난주
            </button>
            <button
              type="button"
              class="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              @click="emit('reset-today')"
            >
              이번주
            </button>
            <button
              type="button"
              class="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-semibold transition"
              :class="
                canMoveNextDay
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              "
              :disabled="!canMoveNextDay"
              @click="emit('move-day', 1)"
            >
              다음주
            </button>
            <div
              v-if="canEditActualOvertime"
              class="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2"
            >
              <span class="text-xs font-semibold text-slate-600">입력 날짜</span>
              <select
                class="h-9 min-w-[140px] rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
                :value="selectedDateText"
                @change="emit('update:selected-input-date', $event.target.value)"
              >
                <option v-for="option in selectedDateOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <div class="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-white px-2 py-2">
                <span class="text-xs font-bold text-emerald-700">가지관</span>
                <label class="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700">
                  <input
                    :checked="lineInputs.branch_head.isNoOvertimeChecked"
                    type="checkbox"
                    class="h-3.5 w-3.5 rounded border-slate-300"
                    @change="emit('update:is-no-overtime-checked', { lineType: 'branch_head', value: $event.target.checked })"
                  />
                  <span>없음</span>
                </label>
                <input
                  v-if="!lineInputs.branch_head.isNoOvertimeChecked"
                  :value="lineInputs.branch_head.actualOvertimeInputMin"
                  type="number"
                  min="0"
                  step="1"
                  class="h-8 w-20 rounded-md border border-slate-300 px-2 text-right text-sm"
                  @input="emit('update:actualOvertimeInputMin', { lineType: 'branch_head', value: Number($event.target.value || 0) })"
                />
                <span
                  v-else
                  class="inline-flex h-8 items-center rounded-md border border-slate-300 bg-slate-50 px-2 text-xs font-semibold text-slate-500"
                >
                  야근없음
                </span>
                <span class="text-[11px] font-semibold text-slate-500">지연</span>
                <input
                  :value="lineInputs.branch_head.delayInputMin"
                  type="number"
                  min="0"
                  step="1"
                  class="h-8 w-20 rounded-md border border-slate-300 px-2 text-right text-sm"
                  @input="emit('update:delayInputMin', { lineType: 'branch_head', value: Number($event.target.value || 0) })"
                />
                <input
                  :value="lineInputs.branch_head.delayReason"
                  type="text"
                  placeholder="지연사유 입력"
                  class="h-8 min-w-[140px] rounded-md border border-slate-300 px-2 text-xs text-slate-700"
                  @input="emit('update:delayReason', { lineType: 'branch_head', value: $event.target.value })"
                />
                <Button class="h-8 px-2.5 text-xs" @click="emit('save-daily-actual', 'branch_head')">저장</Button>
              </div>
              <div class="flex flex-wrap items-center gap-2 rounded-md border border-cyan-200 bg-white px-2 py-2">
                <span class="text-xs font-bold text-cyan-700">메인관</span>
                <label class="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700">
                  <input
                    :checked="lineInputs.main_hole.isNoOvertimeChecked"
                    type="checkbox"
                    class="h-3.5 w-3.5 rounded border-slate-300"
                    @change="emit('update:is-no-overtime-checked', { lineType: 'main_hole', value: $event.target.checked })"
                  />
                  <span>없음</span>
                </label>
                <input
                  v-if="!lineInputs.main_hole.isNoOvertimeChecked"
                  :value="lineInputs.main_hole.actualOvertimeInputMin"
                  type="number"
                  min="0"
                  step="1"
                  class="h-8 w-20 rounded-md border border-slate-300 px-2 text-right text-sm"
                  @input="emit('update:actualOvertimeInputMin', { lineType: 'main_hole', value: Number($event.target.value || 0) })"
                />
                <span
                  v-else
                  class="inline-flex h-8 items-center rounded-md border border-slate-300 bg-slate-50 px-2 text-xs font-semibold text-slate-500"
                >
                  야근없음
                </span>
                <span class="text-[11px] font-semibold text-slate-500">지연</span>
                <input
                  :value="lineInputs.main_hole.delayInputMin"
                  type="number"
                  min="0"
                  step="1"
                  class="h-8 w-20 rounded-md border border-slate-300 px-2 text-right text-sm"
                  @input="emit('update:delayInputMin', { lineType: 'main_hole', value: Number($event.target.value || 0) })"
                />
                <input
                  :value="lineInputs.main_hole.delayReason"
                  type="text"
                  placeholder="지연사유 입력"
                  class="h-8 min-w-[140px] rounded-md border border-slate-300 px-2 text-xs text-slate-700"
                  @input="emit('update:delayReason', { lineType: 'main_hole', value: $event.target.value })"
                />
                <Button class="h-8 px-2.5 text-xs" @click="emit('save-daily-actual', 'main_hole')">저장</Button>
              </div>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
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
      </div>
    </header>

    <div class="space-y-4 px-4 py-4 md:px-6">
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <article
          v-for="line in summary.lines"
          :key="line.key"
          class="rounded-2xl bg-white p-4"
          :class="
            line.accent === 'emerald' ? 'border border-emerald-200' : 'border border-cyan-200'
          "
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p
                class="text-xs font-bold"
                :class="line.accent === 'emerald' ? 'text-emerald-700' : 'text-cyan-700'"
              >
                {{ line.title }} {{ line.quantityLabel }}
              </p>
              <p class="mt-1 text-3xl font-extrabold text-slate-900">{{ line.heroQtyText }}</p>
              <p class="text-[11px] font-semibold text-slate-500">{{ line.heroQtyLabel }}</p>
            </div>
            <span
              class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="
                line.weekendText === '필요'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              "
            >
              주말 {{ line.weekendText }}
            </span>
          </div>
          <div class="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span class="rounded-full bg-slate-900 px-3 py-1.5 text-white">전체 {{ line.totalQtyText }}</span>
            <span class="rounded-full bg-slate-50 px-3 py-1.5 text-slate-700">배포 전체 {{ line.distributedQtyText }}</span>
            <span class="rounded-full bg-slate-50 px-3 py-1.5 text-slate-700">완료 처리 {{ line.completedQtyText }}</span>
            <span class="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">미배포 대기 {{ line.pendingQtyText }}</span>
            <span
              class="rounded-full px-3 py-1.5"
              :class="line.accent === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-cyan-50 text-cyan-700'"
            >
              계산야근 {{ line.calculatedOvertimeText }}
            </span>
          </div>
          <div class="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">작업시간 {{ line.unitSecText }}</span>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">정시 {{ line.regularDayQtyText }}</span>
            <span
              class="rounded-full px-2.5 py-1"
              :class="line.accent === 'emerald' ? 'bg-emerald-100 text-emerald-800' : 'bg-cyan-100 text-cyan-800'"
            >
              실제 {{ line.actualOvertimeText }}
            </span>
            <span class="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">일치율 {{ line.matchRateText }}</span>
          </div>
        </article>
        <div class="rounded-2xl border border-violet-200 bg-white p-4">
          <p class="text-xs font-bold text-violet-700">전체 평균 데이터</p>
          <p class="mt-2 text-xl font-extrabold text-slate-900">{{ summary.average.periodText }}</p>
          <div class="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span class="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">집계 {{ summary.average.weeksCountText }}</span>
            <span class="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">헤드 평균 {{ summary.average.avgHeadQtyText }}</span>
            <span class="rounded-full bg-cyan-50 px-3 py-1.5 text-cyan-700">홀 평균 {{ summary.average.avgHoleQtyText }}</span>
            <span class="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">그루브 평균 {{ summary.average.avgGrooveQtyText }}</span>
          </div>
         
        </div>
      </div>

      <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        통계 불러오는 중...
      </div>
      <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {{ error }}
      </div>
      <div v-else class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 class="text-sm font-bold text-slate-900">일자별 계산표</h2>
            </div>
            <p class="text-xs font-semibold text-slate-500">입력 기준일: {{ selectedDateText }} ({{ selectedWeekday }})</p>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-[1220px] w-full border-collapse">
              <thead class="bg-slate-100">
                <tr>
                  <th class="border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700">일자</th>
                  <th class="border border-emerald-300 bg-emerald-100 px-3 py-2 text-center text-xs font-bold text-emerald-800">가지관 계산 야근</th>
                  <th class="border border-emerald-300 bg-emerald-100 px-3 py-2 text-center text-xs font-bold text-emerald-800">가지관 실제 야근</th>
                  <th class="min-w-[120px] border border-emerald-300 bg-emerald-100 px-3 py-2 text-center text-xs font-bold text-emerald-800">가지관 비고</th>
                  <th class="border border-cyan-300 bg-cyan-100 px-3 py-2 text-center text-xs font-bold text-cyan-800">메인관 계산 야근</th>
                  <th class="border border-cyan-300 bg-cyan-100 px-3 py-2 text-center text-xs font-bold text-cyan-800">메인관 실제 야근</th>
                  <th class="min-w-[140px] border border-cyan-300 bg-cyan-100 px-3 py-2 text-center text-xs font-bold text-cyan-800">메인관 비고</th>
                  <th class="min-w-[280px] border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700">지연사유</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in weekdayPlanRows"
                  :key="row.key"
                  :class="row.isSelected ? 'bg-orange-50' : 'bg-white'"
                >
                  <td class="whitespace-nowrap border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-900">
                    {{ row.dateText }}
                  </td>
                  <td
                    class="border border-slate-200 px-3 py-3 text-center text-sm font-bold text-emerald-700"
                    :class="row.isSelected ? 'bg-orange-50' : 'bg-white'"
                  >
                    {{ row.branch.calculatedText }}
                  </td>
                  <td
                    class="border border-slate-200 px-3 py-3 text-center text-sm font-bold text-emerald-700"
                    :class="row.isSelected ? 'bg-orange-50' : 'bg-white'"
                  >
                    {{ row.branch.actualText }}
                  </td>
                  <td
                    class="border border-slate-200 px-3 py-3 text-center text-sm font-semibold"
                    :class="[row.isSelected ? 'bg-orange-50' : 'bg-white', row.branch.tone]"
                  >
                    {{ row.branch.note }}
                  </td>
                  <td class="border border-orange-50 bg-orange-50/20 px-3 py-3 text-center text-sm font-bold text-cyan-700">
                    {{ row.main.calculatedText }}
                  </td>
                  <td class="border border-orange-50 bg-orange-50/20 px-3 py-3 text-center text-sm font-bold text-cyan-700">
                    {{ row.main.actualText }}
                  </td>
                  <td class="min-w-[140px] border border-orange-50 bg-orange-50/20 px-3 py-3 text-center text-sm font-semibold" :class="row.main.tone">
                    {{ row.main.note }}
                  </td>
                  <td class="min-w-[280px] border border-slate-200 px-4 py-3 text-center text-sm text-slate-700">
                    {{ row.delaySummaryText }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

