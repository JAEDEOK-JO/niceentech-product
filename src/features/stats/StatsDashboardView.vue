<script setup>
import Button from '@/components/ui/button/Button.vue'

defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  selectedDateText: { type: String, default: '' },
  selectedWeekday: { type: String, default: '' },
  selectedDateKey: { type: String, default: '' },
  summary: { type: Object, required: true },
  stageStats: { type: Array, default: () => [] },
  formatHourMinute: { type: Function, required: true },
})

const emit = defineEmits(['go-home', 'refresh', 'move-day', 'reset-today', 'update:selectedDateKey'])

const toPercent = (num, den) => {
  const n = Number(num) || 0
  const d = Number(den) || 0
  if (d <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((n / d) * 100)))
}
</script>

<template>
  <section class="min-h-screen w-full bg-slate-50">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div class="flex items-center justify-between px-4 py-3 md:px-6">
        <div>
          <h1 class="text-lg font-bold text-slate-900">일일 통계</h1>
          <p class="text-xs text-slate-500">{{ selectedDateText }} ({{ selectedWeekday }})</p>
        </div>
        <div class="flex items-center gap-2">
          <Button class="h-8 px-2 text-xs" variant="outline" @click="emit('move-day', -1)">지난일</Button>
          <Button class="h-8 px-2 text-xs" variant="outline" @click="emit('reset-today')">오늘</Button>
          <Button class="h-8 px-2 text-xs" variant="outline" @click="emit('move-day', 1)">다음일</Button>
          <input
            :value="selectedDateKey"
            type="date"
            class="h-8 rounded-md border border-slate-300 px-2 text-xs"
            @input="emit('update:selectedDateKey', $event.target.value)"
          />
          <Button class="h-8 px-3 text-xs" variant="outline" @click="emit('refresh')">새로고침</Button>
          <Button class="h-8 px-3 text-xs" variant="outline" @click="emit('go-home')">홈</Button>
        </div>
      </div>
    </header>

    <div class="space-y-4 px-4 py-4 md:px-6">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div class="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-bold text-indigo-700">생산 진척률</p>
          <p class="mt-1 text-xl font-extrabold text-slate-900">
            {{ toPercent(summary.completedHead, summary.totalHead) }}%
          </p>
          <p class="text-xs text-slate-500">{{ summary.completedHead }} / {{ summary.totalHead }}</p>
          <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full bg-indigo-500 transition-all duration-300"
              :style="{ width: `${toPercent(summary.completedHead, summary.totalHead)}%` }"
            />
          </div>
        </div>

        <div class="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-bold text-emerald-700">도면 배포율</p>
          <p class="mt-1 text-xl font-extrabold text-slate-900">
            {{ toPercent(summary.distributedDrawingCount, summary.totalDrawingCount) }}%
          </p>
          <p class="text-xs text-slate-500">{{ summary.distributedDrawingCount }} / {{ summary.totalDrawingCount }}</p>
          <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full bg-emerald-500 transition-all duration-300"
              :style="{ width: `${toPercent(summary.distributedDrawingCount, summary.totalDrawingCount)}%` }"
            />
          </div>
        </div>

        <div class="rounded-xl border border-fuchsia-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-bold text-fuchsia-700">야근 요약</p>
          <p class="mt-1 text-sm font-extrabold text-slate-900">
            오늘 {{ summary.todayOvertimeText }} / 주간 {{ summary.weeklyOvertimeText }}
          </p>
          <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full bg-fuchsia-500 transition-all duration-300"
              :style="{ width: `${toPercent(summary.todayOvertimeSec, 5 * 3600)}%` }"
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 md:grid-cols-6">
        <div class="rounded-xl border border-indigo-200 bg-white p-3">
          <p class="text-[11px] font-bold text-indigo-700">일일목표</p>
          <p class="mt-1 text-base font-extrabold text-slate-900">{{ summary.dailyTargetHead }}</p>
        </div>
        <div class="rounded-xl border border-emerald-200 bg-white p-3">
          <p class="text-[11px] font-bold text-emerald-700">완료</p>
          <p class="mt-1 text-base font-extrabold text-slate-900">{{ summary.completedHead }}</p>
        </div>
        <div class="rounded-xl border border-blue-200 bg-white p-3">
          <p class="text-[11px] font-bold text-blue-700">총수량</p>
          <p class="mt-1 text-base font-extrabold text-slate-900">{{ summary.totalHead }}</p>
        </div>
        <div class="rounded-xl border border-amber-200 bg-white p-3">
          <p class="text-[11px] font-bold text-amber-700">잔여</p>
          <p class="mt-1 text-base font-extrabold text-slate-900">{{ summary.remainingHead }}</p>
        </div>
        <div class="rounded-xl border border-fuchsia-200 bg-white p-3">
          <p class="text-[11px] font-bold text-fuchsia-700">오늘 야근 합</p>
          <p class="mt-1 text-sm font-extrabold text-slate-900">{{ summary.todayOvertimeText }}</p>
        </div>
        <div class="rounded-xl border border-cyan-200 bg-white p-3">
          <p class="text-[11px] font-bold text-cyan-700">주간 야근 합</p>
          <p class="mt-1 text-sm font-extrabold text-slate-900">{{ summary.weeklyOvertimeText }}</p>
        </div>
      </div>

      <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        통계 로딩 중...
      </div>
      <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {{ error }}
      </div>
      <div v-else class="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[760px] border-collapse">
          <thead class="bg-slate-100">
            <tr>
              <th class="border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-700">공정</th>
              <th class="border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-700">완료율</th>
              <th class="border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-700">진척 그래프</th>
              <th class="border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-700">진행수량</th>
              <th class="border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-700">완료수량</th>
              <th class="border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-700">총수량</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in stageStats" :key="row.key">
              <td class="border border-slate-200 px-2 py-2 text-center text-sm font-bold text-slate-800">{{ row.label }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center text-sm font-extrabold text-indigo-700">{{ row.completionRate }}%</td>
              <td class="border border-slate-200 px-2 py-2">
                <div class="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div class="h-full bg-slate-400" :style="{ width: `${toPercent(row.waitingQty, row.totalQty)}%` }"></div>
                  <div class="h-full bg-emerald-400" :style="{ width: `${toPercent(row.inProgressQty, row.totalQty)}%` }"></div>
                  <div class="h-full bg-red-400" :style="{ width: `${toPercent(row.doneQty, row.totalQty)}%` }"></div>
                </div>
              </td>
              <td class="border border-slate-200 px-2 py-2 text-center text-sm text-slate-700">{{ row.inProgressQty }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center text-sm text-slate-700">{{ row.doneQty }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center text-sm text-slate-700">{{ row.totalQty }}</td>
            </tr>
            <tr v-if="stageStats.length === 0">
              <td colspan="6" class="border border-slate-200 px-3 py-5 text-center text-sm text-slate-500">작업 통계가 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
