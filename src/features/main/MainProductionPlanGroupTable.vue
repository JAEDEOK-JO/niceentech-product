<script setup>
import {
  tableColumns,
  getCellText,
  getWorkerStatusClass,
  isStatusCompactColumn,
  isCompactTextColumn,
  getColumnStyle,
  getBodyCellClass,
  totalTableWidth,
} from '@/features/main/mainProductionPlanConfig'

const props = defineProps({
  groupData: { type: Object, required: true },
  groupIndex: { type: Number, required: true },
  overallTotals: { type: Object, required: true },
  showFullDates: { type: Boolean, default: false },
})

const clickableColumns = ['initial', 'design_distributed', 'name', 'company', 'place', 'area', 'drawing', 'worker_t', 'worker_nasa', 'worker_main', 'worker_welding']
const tableBorderStyle = {
  borderColor: 'rgba(0, 0, 0, 0.28)',
  borderWidth: '0.1px',
}

const emit = defineEmits(['open-row-menu', 'cell-click', 'cell-long-press'])

const LONG_PRESS_MS = 700
let longPressTimer = null
let longPressTriggered = false
const longPressColumns = ['worker_welding', 'worker_nasa']
const isLongPressColumn = (columnKey) => longPressColumns.includes(columnKey)

const onCellPointerDown = (row, columnKey) => {
  longPressTriggered = false
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    longPressTriggered = true
    emit('cell-long-press', { row, columnKey })
  }, LONG_PRESS_MS)
}
const onCellPointerUp = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}
const onCellClick = (row, columnKey) => {
  if (longPressTriggered) {
    longPressTriggered = false
    return
  }
  emit('cell-click', { row, columnKey })
}
const displayCellText = (row, key) => getCellText(row, key, { includeYear: props.showFullDates })
const tableWidthStyle = {
  '--production-plan-table-width': `${totalTableWidth}px`,
}
</script>

<template>
  <div>
    <div class="mb-3 flex items-center justify-between gap-3 md:hidden">
      <h2 class="text-base font-extrabold text-slate-900">{{ groupData.group }}</h2>
    </div>

    <div class="space-y-3 md:hidden">
      <div
        v-if="groupData.rows.length === 0"
        class="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-[13px] font-medium text-slate-500 shadow-sm"
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
            <p class="mt-1 text-[13px] font-extrabold text-slate-900">{{ row.company || '-' }}</p>
            <p class="text-xs text-slate-600">{{ row.place || '-' }}</p>
            <p class="text-xs text-slate-600">{{ row.area || '-' }}</p>
          </div>
          <div class="text-right text-xs font-semibold text-slate-600">
            <p>
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5"
                :class="row.calculation ? 'bg-lime-100 text-lime-900' : 'bg-transparent text-slate-600'"
              >
                담당 {{ row.name || '-' }}
              </span>
            </p>
            <p>설계배포 {{ displayCellText(row, 'design_distributed') }}</p>
            <p>도착 {{ displayCellText(row, 'delivery_due_date') || '-' }}</p>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-4 gap-1.5">
          <div
            v-for="column in tableColumns.filter((column) => ['worker_t', 'worker_nasa', 'worker_main', 'worker_welding'].includes(column.key))"
            :key="`${row.id}-${column.key}`"
            class="min-w-0 rounded-lg border border-slate-200 px-1.5 py-2 text-center text-[10px] font-bold leading-tight sm:px-2 sm:py-3 sm:text-[11px]"
            :class="getWorkerStatusClass(row, column.key)"
          >
            <p class="whitespace-nowrap">{{ column.label }}</p>
            <p class="mt-1 whitespace-nowrap">{{ displayCellText(row, column.key) }}</p>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
          <p class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-semibold whitespace-nowrap">
            헤드 {{ displayCellText(row, 'head') || '' }}
          </p>
          <p class="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 whitespace-nowrap">
            홀 {{ displayCellText(row, 'hole') || '' }}
          </p>
          <p class="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700 whitespace-nowrap">
            그루브 {{ displayCellText(row, 'groove') || '' }}
          </p>
          <p class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 whitespace-nowrap">
            중량 {{ displayCellText(row, 'weight') || '' }}
          </p>
          <button type="button" class="w-full bg-transparent px-0 py-0 text-left text-slate-600" @click="emit('open-row-menu', row)">
            비고 {{ row.memo || '' }}
          </button>
          <div class="flex w-full justify-end">
            <p
              class="inline-flex items-center rounded-full px-2.5 py-1 font-bold whitespace-nowrap"
              :class="
                displayCellText(row, 'drawing') === '있음'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-white text-black'
              "
            >
              도면
            </p>
          </div>
        </div>
      </article>
    </div>

    <div class="production-plan-table-wrap hidden md:block" :style="tableWidthStyle">
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

      <table class="production-plan-table w-full table-fixed border-collapse bg-white">
        <colgroup>
          <col v-for="column in tableColumns" :key="`${groupData.group}-col-${column.key}`" :style="getColumnStyle(column)" />
        </colgroup>
        <thead class="bg-slate-50">
          <tr>
            <th
              v-for="column in tableColumns"
              :key="`${groupData.group}-${column.key}`"
              class="h-[50px] border border-slate-200 px-2 py-px align-middle text-[13px] font-extrabold text-slate-700"
              :class="column.align === 'center' ? 'text-center' : 'text-left'"
              :style="[getColumnStyle(column), tableBorderStyle]"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="groupData.rows.length === 0">
            <td :colspan="tableColumns.length" class="border border-slate-200 px-3 py-4 text-center text-[13px] font-medium text-slate-500" :style="tableBorderStyle">
              데이터 없음
            </td>
          </tr>
          <tr v-for="row in groupData.rows" :key="`${groupData.group}-${row.id}`" class="hover:bg-slate-50">
            <td
              v-for="column in tableColumns"
              :key="`${groupData.group}-${row.id}-${column.key}`"
              :class="getBodyCellClass(row, column)"
              :style="[getColumnStyle(column), tableBorderStyle]"
            >
              <button
                v-if="column.key === 'memo'"
                type="button"
                class="flex h-full w-full items-center justify-center bg-transparent p-0 text-center text-[13px] font-medium text-slate-700"
                @click="emit('open-row-menu', row)"
              >
                <span class="cell-fixed-text">{{ displayCellText(row, column.key) || '' }}</span>
              </button>
              <button
                v-else-if="clickableColumns.includes(column.key)"
                type="button"
                class="flex h-full w-full items-center justify-center bg-transparent p-0 text-inherit"
                @click="isLongPressColumn(column.key) ? onCellClick(row, column.key) : emit('cell-click', { row, columnKey: column.key })"
                @mousedown="isLongPressColumn(column.key) ? onCellPointerDown(row, column.key) : undefined"
                @mouseup="isLongPressColumn(column.key) ? onCellPointerUp() : undefined"
                @mouseleave="isLongPressColumn(column.key) ? onCellPointerUp() : undefined"
                @touchstart="isLongPressColumn(column.key) ? onCellPointerDown(row, column.key) : undefined"
                @touchend="isLongPressColumn(column.key) ? onCellPointerUp() : undefined"
                @touchcancel="isLongPressColumn(column.key) ? onCellPointerUp() : undefined"
              >
                <span class="cell-fixed-text block w-full" :class="isStatusCompactColumn(column.key) ? 'text-center text-[11px] font-bold' : ''">{{ displayCellText(row, column.key) }}</span>
              </button>
              <span v-else-if="isStatusCompactColumn(column.key) || isCompactTextColumn(column.key)" class="cell-fixed-text block text-center text-[11px] font-bold">
                {{ displayCellText(row, column.key) }}
              </span>
              <span v-else class="cell-fixed-text block">{{ displayCellText(row, column.key) }}</span>
            </td>
          </tr>
          <tr class="font-extrabold text-slate-900" :class="groupData.group === '기타' ? 'bg-red-50' : 'bg-blue-50'">
            <td colspan="10" class="h-[50px] border border-slate-200 px-2 py-px align-middle text-center text-[13px]" :style="tableBorderStyle"></td>
            <td class="h-[50px] border border-slate-200 px-2 py-px align-middle text-center text-[13px]" :style="tableBorderStyle">합계</td>
            <td class="h-[50px] border border-slate-200 px-2 py-px align-middle text-center text-[13px]" :style="tableBorderStyle">{{ groupData.totals.head }}</td>
            <td class="h-[50px] border border-slate-200 px-2 py-px align-middle text-center text-[13px]" :style="tableBorderStyle">{{ groupData.totals.hole }}</td>
            <td class="h-[50px] border border-slate-200 px-2 py-px align-middle text-center text-[13px]" :style="tableBorderStyle">{{ groupData.totals.groove }}</td>
            <td class="h-[50px] border border-slate-200 px-2 py-px align-middle text-center text-[13px]" :style="tableBorderStyle">{{ groupData.totals.weight.toFixed(1) }}</td>
            <td class="h-[50px] border border-slate-200 px-2 py-px align-middle text-center text-[13px]" :style="tableBorderStyle"></td>
            <td class="h-[50px] border border-slate-200 px-2 py-px align-middle text-center text-[13px]" :style="tableBorderStyle"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.cell-fixed-text {
  display: block;
  overflow: hidden;
  line-height: 1.2rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: normal;
}

.production-plan-table-wrap {
  min-width: 100%;
}

@media (min-width: 768px) and (max-width: 1279px) {
  .production-plan-table-wrap {
    min-width: var(--production-plan-table-width);
  }
}
</style>
