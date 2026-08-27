<script setup>
import DailyWorkSummaryDelayedList from './DailyWorkSummaryDelayedList.vue'
import DailyWorkSummaryTodayTable from './DailyWorkSummaryTodayTable.vue'
import DailyWorkSummaryWeekTable from './DailyWorkSummaryWeekTable.vue'

defineProps({
  processSummaries: { type: Array, required: true },
  weekColumns: { type: Array, required: true },
  weekProcesses: { type: Array, required: true },
  delayedItems: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
</script>

<template>
  <div v-if="loading" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
    불러오는 중
  </div>
  <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center text-sm text-red-700">
    {{ error }}
  </div>
  <div v-else class="space-y-5">
    <section>
      <h2 class="mb-2 text-sm font-extrabold text-slate-900">오늘</h2>
      <DailyWorkSummaryTodayTable :summaries="processSummaries" />
    </section>

    <section>
      <h2 class="mb-2 text-sm font-extrabold text-slate-900">주간 완료</h2>
      <DailyWorkSummaryWeekTable :columns="weekColumns" :processes="weekProcesses" />
    </section>

    <section>
      <h2 class="mb-2 text-sm font-extrabold text-slate-900">
        지연
        <span v-if="delayedItems.length > 0" class="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">{{ delayedItems.length }}건</span>
      </h2>
      <DailyWorkSummaryDelayedList :items="delayedItems" />
    </section>
  </div>
</template>
