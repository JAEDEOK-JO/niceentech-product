<script setup>
import { inchCell, qtyCell } from './summaryLabels'
import { processBadgeClass } from './summaryBadges'

defineProps({
  columns: { type: Array, required: true },
  processes: { type: Array, required: true },
})
</script>

<template>
  <section class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table class="min-w-full border-collapse text-sm">
      <thead class="bg-slate-50">
        <tr>
          <th class="w-32 border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">공정</th>
          <th
            v-for="column in columns"
            :key="column.key"
            class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700"
            :class="column.isSelected ? 'bg-slate-200' : ''"
          >
            {{ column.weekday }} {{ column.dateLabel }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="process in processes" :key="process.key">
          <td class="border border-slate-200 px-2 py-2 text-center">
            <span class="rounded-lg px-2.5 py-1 text-xs font-bold text-white" :class="processBadgeClass(process.accent)">
              {{ process.displayLabel }}
            </span>
          </td>
          <td
            v-for="(day, index) in process.days"
            :key="`${process.key}-${day.key}`"
            class="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-900"
            :class="columns[index]?.isSelected ? 'bg-slate-50' : ''"
          >
            {{ qtyCell(day.qty) }}
            <div v-if="process.showInch && inchCell(day.inch)" class="text-xs font-semibold text-slate-500">
              {{ inchCell(day.inch) }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
