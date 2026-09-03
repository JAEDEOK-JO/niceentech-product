<script setup>
import { computed, ref } from 'vue'
import InventorySheetCell from './InventorySheetCell.vue'
import { applySheetDate, displayColumnDate } from '../sheet/sheetDate'
import { buildSheetNavRows, nextSheetCellKey } from '../sheet/sheetKeyboard'
import { useStickyAddButton } from '../sheet/useStickyAddButton'
import { buildMaterialRows, buildSummaries, formatBlankZero, formatQuantity, quantityClass } from '../sheet/sheetFormat'

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
const outColspan = computed(() => 2 + outCount.value)
const inMinWidth = computed(() => 192 + 120 + Math.max(inCount.value, 1) * 100)
const outMinWidth = computed(() => 120 + Math.max(outCount.value, 1) * 100)

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

const quantityValue = (column, materialId) => column.quantities?.[String(materialId)] ?? ''

const onHeaderInput = (column, key, value) => {
  if (key === 'date') applySheetDate(column, value)
  else column[key] = value
}

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
      <table class="ui-sheet sheet-in" :style="{ minWidth: `${inMinWidth}px` }">
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
            <td class="sticky-col s-128 sum-cell sum-net" :class="quantityClass(summaries[row.id]?.net, { showZero: true })">
              {{ formatQuantity(summaries[row.id]?.net) }}
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
      <table class="ui-sheet sheet-out" :style="{ minWidth: `${outMinWidth}px` }">
        <colgroup>
          <col class="col-spec" />
          <col class="col-sub" />
          <col v-for="column in outboundColumns" :key="`col-out-${column.localId}`" class="col-event" />
        </colgroup>
        <tbody>
          <tr class="section-row section-out top-stick t-0">
            <td colspan="2" class="sticky-col s-0 section-cell">산출</td>
            <td :colspan="outColspan - 2" class="section-cell"></td>
          </tr>

          <tr
            v-for="headerRow in outHeaderRows"
            :key="`out-${headerRow.key}`"
            class="out-row head-row top-stick"
            :class="topClassByKey[headerRow.key]"
          >
            <th colspan="2" class="sticky-col s-label s-edge label-cell">{{ headerRow.label }}</th>
            <td
              v-for="column in outboundColumns"
              :key="`out-${headerRow.key}-${column.localId}`"
              class="head-value"
              :class="headerRow.key === 'memo' ? 'cell-memo' : ''"
            >
              <InventorySheetCell
                :model-value="headerValue(column, headerRow.key)"
                input-type="text"
                :edit-key="cellKey('out', column, headerRow.key)"
                :text-class="headerRow.key === 'date' ? 'cell-date' : ''"
                @start="emit('start-edit', { side: 'out', column, field: headerRow.key })"
                @update:model-value="onHeaderInput(column, headerRow.key, $event)"
                @commit="emit('commit-edit', { side: 'out', column, field: headerRow.key })"
                @cancel="emit('cancel-edit', { side: 'out', column, field: headerRow.key })"
                @navigate="onNavigate(cellKey('out', column, headerRow.key), $event)"
              />
            </td>
          </tr>

          <tr v-for="row in materialRows" :key="`out-${row.id}`" class="out-row">
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
.col-spec { width: 72px; }
.col-sub { width: 48px; }
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
.s-label { left: 192px; }
.s-sub { left: 264px; }

.sheet-out .s-label { left: 0; }
.sheet-out .s-sub { left: 72px; }

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

.cell-memo {
  padding: 4px;
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
