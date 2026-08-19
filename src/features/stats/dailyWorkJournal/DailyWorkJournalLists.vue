<script setup>
import { ref } from 'vue'
import { formatPositiveDecimal } from '@/features/main/productionPlanNumbers'
import DailyWorkJournalWeekSummary from './DailyWorkJournalWeekSummary.vue'

const props = defineProps({
  tab: { type: Object, required: true },
  lists: { type: Object, required: true },
  weekCompleted: { type: Array, default: () => [] },
  inProgressQty: { type: Number, required: true },
  completedQty: { type: Number, required: true },
  inProgressInch: { type: Number, required: true },
  completedInch: { type: Number, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const listTab = ref('completed')

function qtyLabel(qty, unit) {
  const n = Number(qty || 0)
  return n > 0 ? `${n.toLocaleString('ko-KR')}${unit}` : ''
}

function inchLabel(value) {
  const text = formatPositiveDecimal(value)
  return text ? `${text}인치` : ''
}

function tabSummary(count, qty, inch) {
  const parts = [`${Number(count || 0).toLocaleString('ko-KR')}건`]
  const qtyText = qtyLabel(qty, props.tab.qtyUnit)
  if (qtyText) parts.push(qtyText)
  if (props.tab.showInch) {
    const inchText = inchLabel(inch)
    if (inchText) parts.push(inchText)
  }
  return parts.join(' · ')
}
</script>

<template>
  <div v-if="loading" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
    불러오는 중
  </div>
  <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center text-sm text-red-700">
    {{ error }}
  </div>
  <div v-else class="space-y-4">
    <DailyWorkJournalWeekSummary :items="weekCompleted" :qty-unit="tab.qtyUnit" :show-inch="tab.showInch" />

    <section class="rounded-2xl border border-slate-200 bg-white p-4">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex gap-1">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-bold transition"
            :class="listTab === 'completed' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="listTab = 'completed'"
          >
            완료 {{ tabSummary(lists.completed.length, completedQty, completedInch) }}
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-bold transition"
            :class="listTab === 'inProgress' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="listTab = 'inProgress'"
          >
            진행중 {{ tabSummary(lists.inProgress.length, inProgressQty, inProgressInch) }}
          </button>
        </div>
      </div>

      <div v-show="listTab === 'inProgress'" class="overflow-x-auto">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">도번</th>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">회사</th>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">현장</th>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">구역</th>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">{{ tab.qtyUnit }}</th>
              <th v-if="tab.showInch" class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">인치</th>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">시작</th>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">며칠째</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="lists.inProgress.length === 0">
              <td :colspan="tab.showInch ? 8 : 7" class="border border-slate-200 px-3 py-8 text-center text-slate-500">진행중이 없습니다.</td>
            </tr>
            <tr v-for="item in lists.inProgress" :key="item.id">
              <td class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.drawingNo || '-' }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.company }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.place }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.area }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-900">{{ item.qtyText }}</td>
              <td v-if="tab.showInch" class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.inchText }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.startedLabel || '-' }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center" :class="item.elapsedDays >= 3 ? 'font-bold text-red-600' : 'text-slate-800'">{{ item.elapsedDays != null ? `${item.elapsedDays}일째` : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-show="listTab === 'completed'" class="overflow-x-auto">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">도번</th>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">회사</th>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">현장</th>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">구역</th>
              <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">{{ tab.qtyUnit }}</th>
              <th v-if="tab.showInch" class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">인치</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="lists.completed.length === 0">
              <td :colspan="tab.showInch ? 6 : 5" class="border border-slate-200 px-3 py-8 text-center text-slate-500">완료가 없습니다.</td>
            </tr>
            <tr v-for="item in lists.completed" :key="item.id">
              <td class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.drawingNo || '-' }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.company }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.place }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.area }}</td>
              <td class="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-900">{{ item.qtyText }}</td>
              <td v-if="tab.showInch" class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.inchText }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
