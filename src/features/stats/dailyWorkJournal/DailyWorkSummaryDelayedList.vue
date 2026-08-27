<script setup>
import { amountLabel } from './summaryLabels'
import { processBadgeClass } from './summaryBadges'

defineProps({
  items: { type: Array, required: true },
})
</script>

<template>
  <section class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table class="min-w-full border-collapse text-sm">
      <thead class="bg-slate-50">
        <tr>
          <th class="w-32 border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">공정</th>
          <th class="w-24 border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">도번</th>
          <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">현장</th>
          <th class="w-40 border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">수량</th>
          <th class="w-24 border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">며칠째</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="items.length === 0">
          <td colspan="5" class="border border-slate-200 px-3 py-8 text-center text-slate-500">지연이 없습니다.</td>
        </tr>
        <tr v-for="item in items" :key="item.rowKey">
          <td class="border border-slate-200 px-2 py-2 text-center">
            <span class="rounded-lg px-2.5 py-1 text-xs font-bold text-white" :class="processBadgeClass(item.accent)">
              {{ item.processLabel }}
            </span>
          </td>
          <td class="border border-slate-200 px-2 py-2 text-center text-slate-800">{{ item.drawingNo || '-' }}</td>
          <td class="border border-slate-200 px-2 py-2 text-left text-slate-800">{{ item.siteLabel }}</td>
          <td class="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-900">
            {{ amountLabel(item.qty, item.inch, item.qtyUnit, item.showInch) }}
          </td>
          <td class="border border-slate-200 px-2 py-2 text-center font-bold text-red-600">
            {{ item.elapsedDays != null ? `${item.elapsedDays}일째` : '-' }}
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
