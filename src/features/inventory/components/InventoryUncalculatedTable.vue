<script setup>
import { computed } from 'vue'
import OverflowHover from '@/components/ui/OverflowHover.vue'
import { statusClass } from '@/features/main/mainProductionPlanConfig'
import { sumPlanPieceCounts } from '@/features/inventory/summary/planPieceCounts'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  showStatus: { type: Boolean, default: false },
  showSite: { type: Boolean, default: false },
  visibleCount: { type: Number, default: -1 },
})

const totals = computed(() => sumPlanPieceCounts(props.rows))
const totalSpan = computed(() => 2 + (props.showStatus ? 1 : 0) + (props.showSite ? 1 : 0))
const visibleRows = computed(() => (props.visibleCount < 0 ? props.rows : props.rows.slice(0, props.visibleCount)))
</script>

<template>
  <table class="w-full table-fixed text-xs">
    <colgroup>
      <col class="w-24" />
      <col v-if="showSite" class="w-44" />
      <col />
      <col v-if="showStatus" class="w-16" />
      <col class="w-12" />
      <col class="w-12" />
      <col class="w-14" />
    </colgroup>
    <thead>
      <tr class="text-slate-500">
        <th class="sticky top-0 bg-white px-3 py-2 text-left font-extrabold">검수날짜</th>
        <th v-if="showSite" class="sticky top-0 bg-white px-3 py-2 text-left font-extrabold">현장</th>
        <th class="sticky top-0 bg-white px-3 py-2 text-left font-extrabold">구역</th>
        <th v-if="showStatus" class="sticky top-0 bg-white px-1 py-2 text-center font-extrabold">상태</th>
        <th class="sticky top-0 bg-white px-1 py-2 text-center font-extrabold">헤드</th>
        <th class="sticky top-0 bg-white px-1 py-2 text-center font-extrabold">홀</th>
        <th class="sticky top-0 bg-white px-1 py-2 text-center font-extrabold">그루브</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in visibleRows" :key="row.id" class="border-t border-slate-100">
        <td class="whitespace-nowrap px-3 py-2 font-extrabold text-slate-700">{{ row.inspectionDate }}</td>
        <td v-if="showSite" class="max-w-0 px-3 py-2 font-extrabold text-slate-900">
          <OverflowHover :text="row.site">
            <span class="block truncate">{{ row.site }}</span>
          </OverflowHover>
        </td>
        <td class="max-w-0 px-3 py-2 font-extrabold text-slate-900">
          <OverflowHover :text="row.area">
            <span class="block truncate">{{ row.area }}</span>
          </OverflowHover>
        </td>
        <td v-if="showStatus" class="px-1 py-2 text-center">
          <span class="inline-flex rounded px-1.5 py-0.5 text-[11px] font-extrabold" :class="statusClass(row.workStatus)">
            {{ row.workStatus }}
          </span>
        </td>
        <td class="px-1 py-2 text-center font-extrabold text-slate-900">{{ row.headText }}</td>
        <td class="px-1 py-2 text-center font-extrabold text-slate-900">{{ row.holeText }}</td>
        <td class="px-1 py-2 text-center font-extrabold text-slate-900">{{ row.grooveText }}</td>
      </tr>
    </tbody>
    <tfoot v-if="rows.length">
      <tr class="border-t border-slate-200">
        <td :colspan="totalSpan" class="sticky bottom-0 bg-white px-3 py-2 font-extrabold text-slate-900">합계</td>
        <td class="sticky bottom-0 bg-white px-1 py-2 text-center font-extrabold text-slate-900">{{ totals.headText }}</td>
        <td class="sticky bottom-0 bg-white px-1 py-2 text-center font-extrabold text-slate-900">{{ totals.holeText }}</td>
        <td class="sticky bottom-0 bg-white px-1 py-2 text-center font-extrabold text-slate-900">{{ totals.grooveText }}</td>
      </tr>
    </tfoot>
  </table>
</template>
