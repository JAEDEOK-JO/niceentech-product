<script setup>
import OverflowHover from '@/components/ui/OverflowHover.vue'
import InventorySummaryReveal from '@/features/inventory/components/InventorySummaryReveal.vue'
import InventoryUncalculatedTable from '@/features/inventory/components/InventoryUncalculatedTable.vue'
import { formatBlankZero, formatQuantity } from '@/features/inventory/sheet/sheetFormat'

defineProps({
  shortageRows: { type: Array, default: () => [] },
  uncalculatedRows: { type: Array, default: () => [] },
  uncalculatedWorkRows: { type: Array, default: () => [] },
  workingRows: { type: Array, default: () => [] },
  showWorking: { type: Boolean, default: true },
  showShortage: { type: Boolean, default: true },
  statusTitle: { type: String, default: '' },
  showSite: { type: Boolean, default: false },
})

const numberClass = (value) => (Number(value) < 0 ? 'text-red-600' : 'text-slate-900')

</script>

<template>
  <div class="grid min-h-0 flex-1 content-start gap-3 overflow-auto pb-4 md:grid-cols-2">
    <section v-if="showShortage" class="min-w-0 rounded-xl border border-slate-200 bg-white">
      <h2 class="border-b border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-900">{{ statusTitle }}</h2>
      <InventorySummaryReveal :count="shortageRows.length">
        <template #default="{ visibleCount }">
      <table class="w-full table-fixed text-xs">
        <colgroup>
          <col class="w-[58%]" />
          <col class="w-[14%]" />
          <col class="w-[14%]" />
          <col class="w-[14%]" />
        </colgroup>
        <thead>
          <tr class="text-slate-500">
            <th class="sticky top-0 bg-white px-3 py-2 text-left font-extrabold">규격</th>
            <th class="sticky top-0 bg-white px-2 py-2 text-center font-extrabold">입고</th>
            <th class="sticky top-0 bg-white px-2 py-2 text-center font-extrabold">산출</th>
            <th class="sticky top-0 bg-white px-2 py-2 text-center font-extrabold">잔고</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in shortageRows.slice(0, visibleCount)" :key="row.id" class="border-t border-slate-100">
            <td class="max-w-0 px-3 py-2 font-extrabold text-slate-900">
              <OverflowHover :text="row.label">
                <span class="block truncate">{{ row.label }}</span>
              </OverflowHover>
            </td>
            <td class="px-2 py-2 text-center font-extrabold" :class="numberClass(row.inbound)">{{ formatBlankZero(row.inbound) }}</td>
            <td class="px-2 py-2 text-center font-extrabold" :class="numberClass(row.outbound)">{{ formatBlankZero(row.outbound) }}</td>
            <td class="px-2 py-2 text-center font-extrabold" :class="numberClass(row.balance)">{{ formatQuantity(row.balance) }}</td>
          </tr>
        </tbody>
      </table>
        </template>
      </InventorySummaryReveal>
    </section>

    <section v-if="showWorking" class="min-w-0 rounded-xl border border-slate-200 bg-white">
      <h2 class="border-b border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-900">작업중</h2>
      <InventorySummaryReveal :count="workingRows.length">
        <template #default="{ visibleCount }">
      <table class="w-full table-fixed text-xs">
        <colgroup>
          <col class="w-24" />
          <col class="w-20" />
          <col />
        </colgroup>
        <thead>
          <tr class="text-slate-500">
            <th class="sticky top-0 bg-white px-3 py-2 text-left font-extrabold">검수날짜</th>
            <th class="sticky top-0 bg-white px-3 py-2 text-left font-extrabold">일자</th>
            <th class="sticky top-0 bg-white px-3 py-2 text-left font-extrabold">구역</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in workingRows.slice(0, visibleCount)" :key="row.id" class="border-t border-slate-100">
            <td class="whitespace-nowrap px-3 py-2 font-extrabold text-slate-700">{{ row.inspectionDate }}</td>
            <td class="whitespace-nowrap px-3 py-2 font-extrabold text-slate-700">{{ row.date }}</td>
            <td class="max-w-0 px-3 py-2 font-extrabold text-slate-900">
              <OverflowHover :text="row.area">
                <span class="block truncate">{{ row.area }}</span>
              </OverflowHover>
            </td>
          </tr>
        </tbody>
      </table>
        </template>
      </InventorySummaryReveal>
    </section>

    <section class="min-w-0 rounded-xl border border-slate-200 bg-white">
      <h2 class="border-b border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-900">미산출</h2>
      <InventorySummaryReveal :count="uncalculatedRows.length">
        <template #default="{ visibleCount }">
          <InventoryUncalculatedTable :rows="uncalculatedRows" :visible-count="visibleCount" :show-site="showSite" />
        </template>
      </InventorySummaryReveal>
    </section>

    <section class="min-w-0 rounded-xl border border-slate-200 bg-white">
      <h2 class="border-b border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-900">미산출 작업</h2>
      <InventorySummaryReveal :count="uncalculatedWorkRows.length">
        <template #default="{ visibleCount }">
          <InventoryUncalculatedTable :rows="uncalculatedWorkRows" :visible-count="visibleCount" :show-site="showSite" show-status />
        </template>
      </InventorySummaryReveal>
    </section>
  </div>
</template>
