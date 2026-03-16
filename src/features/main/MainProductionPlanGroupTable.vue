<script setup>
import {
  tableColumns,
  getCellText,
  statusClass,
  isStatusCompactColumn,
  isCompactTextColumn,
  getColumnStyle,
  getBodyCellClass,
} from '@/features/main/mainProductionPlanConfig'

defineProps({
  groupData: { type: Object, required: true },
  groupIndex: { type: Number, required: true },
  overallTotals: { type: Object, required: true },
})
</script>

<template>
  <div>
    <div class="mb-3 flex items-center justify-between gap-3 md:hidden">
      <h2 class="text-base font-extrabold text-slate-900">{{ groupData.group }}</h2>
    </div>

    <div class="space-y-3 md:hidden">
      <div
        v-if="groupData.rows.length === 0"
        class="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500 shadow-sm"
      >
        데이터 없음
      </div>
      <article
        v-for="row in groupData.rows"
        :key="`main-mobile-${groupData.group}-${row.id}`"
        class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-bold text-slate-500">{{ row.initial || '-' }}</p>
            <p class="mt-1 text-sm font-bold text-slate-900">{{ row.company || '-' }}</p>
            <p class="text-xs text-slate-600">{{ row.place || '-' }}</p>
            <p class="text-xs text-slate-600">{{ row.area || '-' }}</p>
          </div>
          <div class="text-right text-xs font-semibold text-slate-600">
            <p>담당 {{ row.name || '-' }}</p>
            <p>설계배포 {{ getCellText(row, 'design_distributed') }}</p>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-4 gap-1.5">
          <div
            v-for="column in tableColumns.filter((column) => ['worker_t', 'worker_nasa', 'worker_main', 'worker_welding'].includes(column.key))"
            :key="`${row.id}-${column.key}`"
            class="min-w-0 rounded-lg border border-slate-200 px-1.5 py-2 text-center text-[10px] font-semibold leading-tight sm:px-2 sm:py-3 sm:text-[11px]"
            :class="statusClass(getCellText(row, column.key))"
          >
            <p class="whitespace-nowrap">{{ column.label }}</p>
            <p class="mt-1 whitespace-nowrap">{{ getCellText(row, column.key) }}</p>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
          <p class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-semibold whitespace-nowrap">
            헤드 {{ getCellText(row, 'head') || '' }}
          </p>
          <p class="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 whitespace-nowrap">
            홀 {{ getCellText(row, 'hole') || '' }}
          </p>
          <p class="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700 whitespace-nowrap">
            그루브 {{ getCellText(row, 'groove') || '' }}
          </p>
          <p class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 whitespace-nowrap">
            중량 {{ getCellText(row, 'weight') || '' }}
          </p>
          <p
            class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
            :class="row?.is_drawing ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
          >
            산출 {{ row?.is_drawing ? '완료' : '전' }}
          </p>
          <p class="w-full rounded-xl bg-slate-50 px-3 py-2 text-slate-600">비고 {{ row.memo || '-' }}</p>
          <div class="flex w-full justify-end">
            <p
              class="inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap"
              :class="
                getCellText(row, 'drawing') === '있음'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-slate-100 text-slate-400'
              "
            >
              도면
            </p>
          </div>
        </div>
      </article>
    </div>

    <div class="hidden overflow-x-auto md:block">
      <div class="mb-2 flex w-full items-center justify-between gap-4">
        <h2 class="shrink-0 text-base font-extrabold text-slate-900 md:text-lg">{{ groupData.group }}</h2>
        <div v-if="groupIndex === 0" class="flex flex-wrap items-center justify-end gap-2">
          <span class="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-extrabold text-indigo-800 shadow-sm">
            헤드 <span class="ml-1 text-[15px] text-indigo-950">{{ overallTotals.head }}</span>
          </span>
          <span class="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-extrabold text-sky-800 shadow-sm">
            홀 <span class="ml-1 text-[15px] text-sky-950">{{ overallTotals.hole }}</span>
          </span>
          <span class="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-extrabold text-violet-800 shadow-sm">
            그루브 <span class="ml-1 text-[15px] text-violet-950">{{ overallTotals.groove }}</span>
          </span>
          <span class="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-800 shadow-sm">
            중량 <span class="ml-1 text-[15px] text-emerald-950">{{ overallTotals.weight.toFixed(1) }}</span>
          </span>
        </div>
      </div>

      <table class="w-full table-fixed border-collapse bg-white">
        <colgroup>
          <col v-for="column in tableColumns" :key="`${groupData.group}-col-${column.key}`" :style="getColumnStyle(column)" />
        </colgroup>
        <thead class="bg-slate-50">
          <tr>
            <th
              v-for="column in tableColumns"
              :key="`${groupData.group}-${column.key}`"
              class="border border-slate-200 px-2 py-[14px] text-sm font-bold text-slate-700"
              :class="column.align === 'center' ? 'text-center' : 'text-left'"
              :style="getColumnStyle(column)"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="groupData.rows.length === 0">
            <td :colspan="tableColumns.length" class="border border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
              데이터 없음
            </td>
          </tr>
          <tr v-for="row in groupData.rows" :key="`${groupData.group}-${row.id}`" class="hover:bg-slate-50">
            <td
              v-for="column in tableColumns"
              :key="`${groupData.group}-${row.id}-${column.key}`"
              :class="getBodyCellClass(row, column)"
              :style="getColumnStyle(column)"
            >
              <span v-if="isStatusCompactColumn(column.key) || isCompactTextColumn(column.key)" class="block text-xs font-semibold">
                {{ getCellText(row, column.key) }}
              </span>
              <span v-else>{{ getCellText(row, column.key) }}</span>
            </td>
          </tr>
          <tr class="bg-white font-extrabold text-slate-900">
            <td colspan="9" class="border border-slate-200 px-2 py-[14px] text-center text-sm"></td>
            <td class="border border-slate-200 px-2 py-[14px] text-center text-sm">합계</td>
            <td class="border border-slate-200 px-2 py-[14px] text-center text-sm">{{ groupData.totals.head }}</td>
            <td class="border border-slate-200 px-2 py-[14px] text-center text-sm">{{ groupData.totals.hole }}</td>
            <td class="border border-slate-200 px-2 py-[14px] text-center text-sm">{{ groupData.totals.groove }}</td>
            <td class="border border-slate-200 px-2 py-[14px] text-center text-sm">{{ groupData.totals.weight.toFixed(1) }}</td>
            <td class="border border-slate-200 px-2 py-[14px] text-center text-sm"></td>
            <td class="border border-slate-200 px-2 py-[14px] text-center text-sm"></td>
            <td class="border border-slate-200 px-2 py-[14px] text-center text-sm"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
