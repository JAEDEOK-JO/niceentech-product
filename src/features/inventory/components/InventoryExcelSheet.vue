<script setup>
import { computed, ref } from 'vue'
import InventorySheetCell from './InventorySheetCell.vue'
import { applySheetDate, displayColumnDate } from '../sheet/sheetDate'
import { buildSheetNavRows, nextSheetCellKey } from '../sheet/sheetKeyboard'
import { useStickyAddButton } from '../sheet/useStickyAddButton'
import { buildMaterialRows, buildSummaries, formatBlankZero, formatQuantity, quantityClass } from '../sheet/sheetFormat'
import { IN_SUM_BLOCK_PX, OUT_SUM_BLOCK_PX, buildSheetLabelColumnWidths } from '../sheet/sheetLabelWidth'
import {
  displayInventoryWorkMemo,
  inventoryWorkMemoToneClass,
  replaceInventoryWorkMemoLabel,
} from '@/features/inventory/work-status'

const props = defineProps({
  materials: { type: Array, default: () => [] },
  inboundColumns: { type: Array, default: () => [] },
  outboundColumns: { type: Array, default: () => [] },
})

const emit = defineEmits(['start-edit', 'commit-edit', 'cancel-edit', 'add-column'])

const materialRows = computed(() => buildMaterialRows(props.materials))
const summaries = computed(() => buildSummaries(props.materials, props.inboundColumns, props.outboundColumns))

const inCount = computed(() => props.inboundColumns.length)
const outCount = computed(() => props.outboundColumns.length)

const inHeaderRows = [
  { key: 'date', label: '일자' },
  { key: 'memo', label: '내역' },
  { key: 'manufacturer', label: '제조사' },
  { key: 'supplier', label: '입고처' },
]

const outHeaderRows = [
  { key: 'date', label: '일자' },
  { key: 'memo', label: '내역' },
]

const inColspan = computed(() => 5 + inCount.value)
const outColspan = computed(() => 5 + outCount.value)
const labelColumnWidths = computed(() => buildSheetLabelColumnWidths(props.materials))
const inMinWidth = computed(() => IN_SUM_BLOCK_PX + labelColumnWidths.value.labelBlockWidth + Math.max(inCount.value, 1) * 100)
const outMinWidth = computed(() => OUT_SUM_BLOCK_PX + labelColumnWidths.value.labelBlockWidth + Math.max(outCount.value, 1) * 100)

const inboundTableStyle = computed(() => ({
  minWidth: `${inMinWidth.value}px`,
  '--group-col': `${labelColumnWidths.value.groupColWidth}px`,
  '--spec-col': `${labelColumnWidths.value.specColWidth}px`,
  '--label-left': `${IN_SUM_BLOCK_PX}px`,
  '--sub-left': `${IN_SUM_BLOCK_PX + labelColumnWidths.value.groupColWidth}px`,
}))

const outboundTableStyle = computed(() => ({
  minWidth: `${outMinWidth.value}px`,
  '--group-col': `${labelColumnWidths.value.groupColWidth}px`,
  '--spec-col': `${labelColumnWidths.value.specColWidth}px`,
  '--label-left': `${OUT_SUM_BLOCK_PX}px`,
  '--sub-left': `${OUT_SUM_BLOCK_PX + labelColumnWidths.value.groupColWidth}px`,
}))

const topClassByKey = {
  date: 't-36',
  memo: 'row-memo t-66',
  manufacturer: 't-96',
  supplier: 't-126',
}

const cellKey = (side, column, field, materialId = '') => `${side}:${column.localId}:${field}:${materialId}`

const headerValue = (column, key) => {
  if (key === 'date') return displayColumnDate(column)
  return column[key] ?? ''
}

const outboundMemoValue = (column) => displayInventoryWorkMemo(column.memo)

const outboundMemoClass = (column) => inventoryWorkMemoToneClass(column.memo)

const onHeaderInput = (column, key, value) => {
  if (key === 'date') applySheetDate(column, value)
  else column[key] = value
}

const onOutboundMemoInput = (column, value) => {
  column.memo = replaceInventoryWorkMemoLabel(column.memo, value)
}

const quantityValue = (column, materialId) => column.quantities?.[String(materialId)] ?? ''

const onQuantityInput = (column, materialId, value) => {
  column.quantities[String(materialId)] = value
}

const quantityOf = (column, materialId) => column?.quantities?.[String(materialId)]

const sheetRoot = ref(null)
const { addButtonTop } = useStickyAddButton(sheetRoot)
const inboundNavRows = computed(() =>
  buildSheetNavRows({
    side: 'in',
    headerKeys: inHeaderRows.map((row) => row.key),
    columns: props.inboundColumns,
    materialIds: materialRows.value.map((row) => row.id),
  }),
)
const outboundNavRows = computed(() =>
  buildSheetNavRows({
    side: 'out',
    headerKeys: outHeaderRows.map((row) => row.key),
    columns: props.outboundColumns,
    materialIds: materialRows.value.map((row) => row.id),
  }),
)

const focusSheetCell = (editKey) => {
  const input = sheetRoot.value?.querySelector(`[data-edit-key="${CSS.escape(editKey)}"]`)
  if (!input) return
  input.focus()
  input.select()
  input.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

const onNavigate = (editKey, direction) => {
  const nextKey = nextSheetCellKey(inboundNavRows.value, outboundNavRows.value, editKey, direction)
  if (nextKey) focusSheetCell(nextKey)
}
</script>

<template>
  <section class="min-h-0 mb-[10px] mt-[-5px] flex-1 overflow-hidden border border-slate-200 bg-white">
    <div ref="sheetRoot" class="sheet-scroll">
      <div class="sheet-block">
      <table class="ui-sheet sheet-in" :style="inboundTableStyle">
        <colgroup>
          <col class="col-sum" />
          <col class="col-sum" />
          <col class="col-sum" />
          <col class="col-spec" />
          <col class="col-sub" />
          <col v-for="column in inboundColumns" :key="`col-in-${column.localId}`" class="col-event" />
        </colgroup>
        <tbody>
          <tr class="section-row section-in top-stick t-0">
            <td colspan="3" class="sticky-col s-0 section-cell">입고</td>
            <td :colspan="inColspan - 3" class="section-cell"></td>
          </tr>

          <tr
            v-for="(headerRow, headerIndex) in inHeaderRows"
            :key="`in-${headerRow.key}`"
            class="in-row head-row top-stick"
            :class="topClassByKey[headerRow.key]"
          >
            <th v-if="headerIndex === 0" :rowspan="inHeaderRows.length" class="sticky-col s-0 sum-head sum-in">총입고</th>
            <th v-if="headerIndex === 0" :rowspan="inHeaderRows.length" class="sticky-col s-64 sum-head sum-out">총산출</th>
            <th v-if="headerIndex === 0" :rowspan="inHeaderRows.length" class="sticky-col s-128 sum-head sum-net">합산</th>
            <th colspan="2" class="sticky-col s-label s-edge label-cell">{{ headerRow.label }}</th>
            <td
              v-for="column in inboundColumns"
              :key="`in-${headerRow.key}-${column.localId}`"
              class="head-value"
              :class="headerRow.key === 'memo' ? 'cell-memo' : ''"
            >
              <InventorySheetCell
                :model-value="headerValue(column, headerRow.key)"
                input-type="text"
                :edit-key="cellKey('in', column, headerRow.key)"
                :text-class="headerRow.key === 'date' ? 'cell-date' : ''"
                @start="emit('start-edit', { side: 'in', column, field: headerRow.key })"
                @update:model-value="onHeaderInput(column, headerRow.key, $event)"
                @commit="emit('commit-edit', { side: 'in', column, field: headerRow.key })"
                @cancel="emit('cancel-edit', { side: 'in', column, field: headerRow.key })"
                @navigate="onNavigate(cellKey('in', column, headerRow.key), $event)"
              />
            </td>
          </tr>

          <tr v-for="row in materialRows" :key="`in-${row.id}`" class="in-row">
            <td class="sticky-col s-0 sum-cell sum-in" :class="quantityClass(summaries[row.id]?.inbound)">
              {{ formatBlankZero(summaries[row.id]?.inbound) }}
            </td>
            <td class="sticky-col s-64 sum-cell sum-out" :class="quantityClass(summaries[row.id]?.outbound)">
              {{ formatBlankZero(summaries[row.id]?.outbound) }}
            </td>
            <td
              class="sticky-col s-128 sum-cell sum-net"
              :class="quantityClass(summaries[row.id]?.inboundNet, { showZero: true })"
            >
              {{ formatQuantity(summaries[row.id]?.inboundNet) }}
            </td>
            <template v-if="!row.group">
              <td colspan="2" class="sticky-col s-label spec-cell s-edge">{{ row.spec }}</td>
            </template>
            <template v-else>
              <td
                v-if="row.renderSpecCell"
                :rowspan="row.groupRowspan"
                class="sticky-col s-label spec-cell"
              >
                {{ row.group }}
              </td>
              <td class="sticky-col s-sub spec-cell s-edge">{{ row.spec }}</td>
            </template>
            <td
              v-for="column in inboundColumns"
              :key="`in-${row.id}-${column.localId}`"
              class="qty-cell"
              :class="[quantityClass(quantityOf(column, row.id)), row.groupTone]"
            >
              <InventorySheetCell
                :model-value="quantityValue(column, row.id)"
                input-type="number"
                :edit-key="cellKey('in', column, 'quantity', row.id)"
                :text-class="quantityClass(quantityValue(column, row.id))"
                @start="emit('start-edit', { side: 'in', column, field: 'quantity', materialId: row.id })"
                @update:model-value="onQuantityInput(column, row.id, $event)"
                @commit="emit('commit-edit', { side: 'in', column, field: 'quantity', materialId: row.id })"
                @cancel="emit('cancel-edit', { side: 'in', column, field: 'quantity', materialId: row.id })"
                @navigate="onNavigate(cellKey('in', column, 'quantity', row.id), $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div class="add-rail">
        <button type="button" class="add-column" aria-label="추가" :style="{ top: addButtonTop }" @click="emit('add-column', 'in')">+</button>
      </div>
      </div>

      <div class="sheet-block">
      <table class="ui-sheet sheet-out" :style="outboundTableStyle">
        <colgroup>
          <col class="col-sum" />
          <col class="col-sum" />
          <col class="col-sum" />
          <col class="col-spec" />
          <col class="col-sub" />
          <col v-for="column in outboundColumns" :key="`col-out-${column.localId}`" class="col-event" />
        </colgroup>
        <tbody>
          <tr class="section-row section-out top-stick t-0">
            <td colspan="3" class="sticky-col s-0 section-cell">산출</td>
            <td :colspan="outColspan - 3" class="section-cell"></td>
          </tr>

          <tr
            v-for="(headerRow, headerIndex) in outHeaderRows"
            :key="`out-${headerRow.key}`"
            class="out-row head-row top-stick"
            :class="topClassByKey[headerRow.key]"
          >
            <th v-if="headerIndex === 0" :rowspan="outHeaderRows.length" class="sticky-col s-0 sum-head sum-in">총입고</th>
            <th v-if="headerIndex === 0" :rowspan="outHeaderRows.length" class="sticky-col s-64 sum-head sum-working">작업중</th>
            <th v-if="headerIndex === 0" :rowspan="outHeaderRows.length" class="sticky-col s-128 sum-head sum-net">합산</th>
            <th colspan="2" class="sticky-col s-label s-edge label-cell">{{ headerRow.label }}</th>
            <td
              v-for="column in outboundColumns"
              :key="`out-${headerRow.key}-${column.localId}`"
              class="head-value"
              :class="headerRow.key === 'memo' ? ['cell-memo', outboundMemoClass(column)] : ''"
            >
              <InventorySheetCell
                :model-value="headerRow.key === 'memo' ? outboundMemoValue(column) : headerValue(column, headerRow.key)"
                input-type="text"
                :multiline="headerRow.key === 'memo'"
                :edit-key="cellKey('out', column, headerRow.key)"
                :text-class="headerRow.key === 'date' ? 'cell-date' : ''"
                @start="emit('start-edit', { side: 'out', column, field: headerRow.key })"
                @update:model-value="headerRow.key === 'memo' ? onOutboundMemoInput(column, $event) : onHeaderInput(column, headerRow.key, $event)"
                @commit="emit('commit-edit', { side: 'out', column, field: headerRow.key })"
                @cancel="emit('cancel-edit', { side: 'out', column, field: headerRow.key })"
                @navigate="onNavigate(cellKey('out', column, headerRow.key), $event)"
              />
            </td>
          </tr>

          <tr v-for="row in materialRows" :key="`out-${row.id}`" class="out-row">
            <td class="sticky-col s-0 sum-cell sum-in" :class="quantityClass(summaries[row.id]?.inbound)">
              {{ formatBlankZero(summaries[row.id]?.inbound) }}
            </td>
            <td class="sticky-col s-64 sum-cell sum-working" :class="quantityClass(summaries[row.id]?.working)">
              {{ formatBlankZero(summaries[row.id]?.working) }}
            </td>
            <td
              class="sticky-col s-128 sum-cell sum-net"
              :class="quantityClass(summaries[row.id]?.workingNet, { showZero: true })"
            >
              {{ formatQuantity(summaries[row.id]?.workingNet) }}
            </td>
            <template v-if="!row.group">
              <td colspan="2" class="sticky-col s-label spec-cell s-edge">{{ row.spec }}</td>
            </template>
            <template v-else>
              <td
                v-if="row.renderSpecCell"
                :rowspan="row.groupRowspan"
                class="sticky-col s-label spec-cell"
              >
                {{ row.group }}
              </td>
              <td class="sticky-col s-sub spec-cell s-edge">{{ row.spec }}</td>
            </template>
            <td
              v-for="column in outboundColumns"
              :key="`out-${row.id}-${column.localId}`"
              class="qty-cell"
              :class="[quantityClass(quantityOf(column, row.id)), row.groupTone]"
            >
              <InventorySheetCell
                :model-value="quantityValue(column, row.id)"
                input-type="number"
                :edit-key="cellKey('out', column, 'quantity', row.id)"
                :text-class="quantityClass(quantityValue(column, row.id))"
                @start="emit('start-edit', { side: 'out', column, field: 'quantity', materialId: row.id })"
                @update:model-value="onQuantityInput(column, row.id, $event)"
                @commit="emit('commit-edit', { side: 'out', column, field: 'quantity', materialId: row.id })"
                @cancel="emit('cancel-edit', { side: 'out', column, field: 'quantity', materialId: row.id })"
                @navigate="onNavigate(cellKey('out', column, 'quantity', row.id), $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div class="add-rail">
        <button type="button" class="add-column" aria-label="추가" :style="{ top: addButtonTop }" @click="emit('add-column', 'out')">+</button>
      </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sheet-scroll {
  overflow: auto;
  height: 100%;
  overscroll-behavior-x: contain;
}

.ui-sheet {
  width: max-content;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.ui-sheet th,
.ui-sheet td {
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  padding: 4px 6px;
  height: 30px;
  text-align: center;
  vertical-align: middle;
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
  background: #fff;
}

.col-sum { width: 64px; }
.col-spec { width: var(--group-col, 72px); }
.col-sub { width: var(--spec-col, 52px); }
.col-event { width: 100px; }

.sheet-block {
  display: flex;
  width: max-content;
  align-items: stretch;
}

.sheet-block + .sheet-block {
  margin-top: 18px;
}

.add-rail {
  width: 48px;
  flex-shrink: 0;
}

.sticky-col {
  position: sticky;
  z-index: 3;
}

.s-0 { left: 0; }
.s-64 { left: 64px; }
.s-128 { left: 128px; }
.s-192 { left: 192px; }
.s-label { left: var(--label-left, 192px); }
.s-sub { left: var(--sub-left, 328px); }

.s-edge {
  box-shadow: 1px 0 0 #cbd5e1, 4px 0 8px -4px rgb(15 23 42 / 0.12);
}

.ui-sheet .top-stick th,
.ui-sheet .top-stick td {
  position: sticky;
  z-index: 5;
}

.ui-sheet .top-stick .sticky-col {
  z-index: 8;
}

.ui-sheet .t-0 th,
.ui-sheet .t-0 td { top: 0; }
.ui-sheet .t-36 th,
.ui-sheet .t-36 td { top: 36px; }
.ui-sheet .t-66 th,
.ui-sheet .t-66 td { top: 66px; }
.ui-sheet .t-96 th,
.ui-sheet .t-96 td { top: 96px; }
.ui-sheet .t-126 th,
.ui-sheet .t-126 td { top: 126px; }

.section-row .section-cell {
  height: 36px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
  text-align: left;
  padding-left: 12px;
  border-right-color: transparent;
}

.section-out .s-0 {
  border-left: 3px solid #e11d48;
}

.section-in .s-0 {
  border-left: 3px solid #2563eb;
}

.ui-sheet .label-cell {
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

.out-row .label-cell {
  color: #be123c;
}

.in-row .label-cell {
  color: #2563eb;
}

.head-value {
  color: #334155;
  font-weight: 800;
}

.ui-sheet .spec-cell {
  background: #f8fafc;
  color: #0f172a;
  font-weight: 900;
  white-space: nowrap;
}

.ui-sheet .sum-head {
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 900;
}

.sum-cell.sum-net {
  background: #f8fafc;
}

.sum-cell.sum-working {
  background: #f0fdfa;
}

.ui-sheet td.sum-cell.sum-net.is-minus {
  color: #dc2626 !important;
}

.cell-memo {
  padding: 4px;
}

.ui-sheet td.cell-memo.bg-teal-100 {
  background: #ccfbf1;
  color: #115e59;
}

.ui-sheet td.cell-memo.bg-indigo-100 {
  background: #e0e7ff;
  color: #3730a3;
}

.ui-sheet td.cell-memo.bg-red-500 {
  background: #ef4444;
  color: #fff;
}

.sheet-out .row-memo th,
.sheet-out .row-memo td {
  height: auto;
  min-height: 30px;
  vertical-align: middle;
  text-align: center;
}

.qty-cell {
  background: #fff;
}

.ui-sheet .qty-cell.tone-0 { background: #fff; }
.ui-sheet .qty-cell.tone-1 { background: #fffbeb; }
.ui-sheet .qty-cell.tone-2 { background: #f0f9ff; }
.ui-sheet .qty-cell.tone-3 { background: #f5f3ff; }

.ui-sheet .is-minus { color: #dc2626; }
.ui-sheet .is-plus,
.ui-sheet .is-zero { color: #0f172a; }
.ui-sheet .is-empty { color: #cbd5e1; }

.add-column {
  position: sticky;
  z-index: 6;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.add-column:hover {
  background: #f8fafc;
}

:deep(.cell-date) {
  letter-spacing: 0.02em;
}
</style>
