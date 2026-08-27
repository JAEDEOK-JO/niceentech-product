<script setup>
import { amountLabel } from './summaryLabels'
import { processBadgeClass } from './summaryBadges'

defineProps({
  summaries: { type: Array, required: true },
})
</script>

<template>
  <section class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table class="min-w-full border-collapse text-sm">
      <thead class="bg-slate-50">
        <tr>
          <th class="w-32 border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">공정</th>
          <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">완료</th>
          <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">진행중</th>
          <th class="w-24 border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">지연</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="summary in summaries" :key="summary.key">
          <td class="border border-slate-200 px-2 py-2 text-center">
            <span class="rounded-lg px-2.5 py-1 text-xs font-bold text-white" :class="processBadgeClass(summary.accent)">
              {{ summary.displayLabel }}
            </span>
          </td>
          <td class="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-900">
            {{ amountLabel(summary.completedQty, summary.completedInch, summary.qtyUnit, summary.showInch) }}
            <span v-if="summary.completedCount > 0" class="ml-1 text-xs font-semibold text-slate-500">{{ summary.completedCount }}건</span>
          </td>
          <td class="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-900">
            {{ amountLabel(summary.inProgressQty, summary.inProgressInch, summary.qtyUnit, summary.showInch) }}
            <span v-if="summary.inProgressCount > 0" class="ml-1 text-xs font-semibold text-slate-500">{{ summary.inProgressCount }}건</span>
          </td>
          <td class="border border-slate-200 px-2 py-2 text-center font-bold" :class="summary.delayedCount > 0 ? 'text-red-600' : 'text-slate-900'">
            {{ summary.delayedCount > 0 ? `${summary.delayedCount}건` : '' }}
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
