<script setup>
import { computed, ref, watch } from 'vue'
import InventorySheetCell from './InventorySheetCell.vue'
import InventorySheetDateCell from './InventorySheetDateCell.vue'
import InventorySheetDateDialog from './InventorySheetDateDialog.vue'
import InventorySheetGroupCell from './InventorySheetGroupCell.vue'
import { applySheetDate, displayColumnDate } from '../sheet/sheetDate'
import { buildSheetNavRows, nextSheetCellKey } from '../sheet/sheetKeyboard'
import { useStickyAddButton } from '../sheet/useStickyAddButton'
import { buildMaterialRows, buildSummaries, formatBlankZero, formatQuantity, quantityClass } from '../sheet/sheetFormat'
import {
  collapseMaterialRows,
  defaultCollapsedGroupNames,
  sumColumnQuantities,
  sumSummaryField,
} from '../sheet/sheetGroupCollapse'
import { IN_SUM_BLOCK_PX, OUT_SUM_BLOCK_PX, buildSheetLabelColumnWidths } from '../sheet/sheetLabelWidth'
import {
  displayInventoryWorkMemo,
  inventoryWorkMemoToneClass,
  replaceInventoryWorkMemoLabel,
  resolveInventoryWorkMemoStatus,
} from '@/features/inventory/work-status'

const props = defineProps({
  materials: { type: Array, default: () => [] },
  inboundColumns: { type: Array, default: () => [] },
  outboundColumns: { type: Array, default: () => [] },
  mode: { type: String, default: 'in' },
})

const emit = defineEmits(['start-edit', 'commit-edit', 'cancel-edit', 'add-column'])

const materialRows = computed(() => buildMaterialRows(props.materials))
const summaries = computed(() => buildSummaries(props.materials, props.inboundColumns, props.outboundColumns))
const collapsedGroupNames = ref([])
const collapseLocked = ref(false)
const visibleMaterialRows = computed(() => collapseMaterialRows(materialRows.value, collapsedGroupNames.value))
const navMaterialIds = computed(() =>
  visibleMaterialRows.value.filter((row) => !row.collapsed).map((row) => row.id),
)

const materialIdentity = computed(() =>
  props.materials.map((material) => `${material.id}:${material.group ?? ''}`).join('|'),
)

const occupiedMaterialIds = computed(() => {
  const ids = new Set()
  for (const column of [...props.inboundColumns, ...props.outboundColumns]) {
    for (const [materialId, value] of Object.entries(column.quantities ?? {})) {
      const number = Number(String(value ?? '').replace(/,/g, '').trim())
      if (Number.isFinite(number) && number !== 0) ids.add(String(materialId))
    }
  }
  return [...ids].sort().join(',')
})

const applyDefaultCollapse = () => {
  collapsedGroupNames.value = defaultCollapsedGroupNames(
    props.materials,
    props.inboundColumns,
    props.outboundColumns,
  )
}

watch(materialIdentity, () => {
  collapseLocked.value = false
  applyDefaultCollapse()
}, { immediate: true })

watch(occupiedMaterialIds, () => {
  if (collapseLocked.value) return
  applyDefaultCollapse()
})

const toggleGroup = (group) => {
  collapseLocked.value = true
  const next = new Set(collapsedGroupNames.value)
  if (next.has(group)) next.delete(group)
  else next.add(group)
  collapsedGroupNames.value = [...next]
}

const groupField = (row, field) => sumSummaryField(summaries.value, row.groupMaterialIds, field)

const groupColumnValue = (column, row) => sumColumnQuantities(column, row.groupMaterialIds)

const inCount = computed(() => props.inboundColumns.length)
const columnSide = 'out'
const columnsForStatus = (status) =>
  props.outboundColumns.filter((column) => resolveInventoryWorkMemoStatus(column.memo) === status)

const standardSums = [
  { key: 'inbound', label: '총입고', field: 'inbound', stickyClass: 's-0', cellClass: 'sum-in', blankZero: true },
  { key: 'working', label: '작업중', field: 'working', stickyClass: 's-64', cellClass: 'sum-working', blankZero: true },
  { key: 'net', label: '합산', field: 'workingNet', stickyClass: 's-128', cellClass: 'sum-net', showZero: true },
]

const productionStockSums = [
  { key: 'inbound', label: '입고', field: 'inbound', stickyClass: 's-0', cellClass: 'sum-in', blankZero: true },
  { key: 'outbound', label: '산출', field: 'outbound', stickyClass: 's-64', cellClass: 'sum-out', blankZero: true },
  { key: 'balance', label: '잔고', field: 'inboundNet', stickyClass: 's-128', cellClass: 'sum-net', showZero: true },
]

const outboundBlocks = computed(() => {
  if (props.mode === 'production') {
    return [
      { key: 'working', label: '작업중', columns: columnsForStatus('작업중'), sums: productionStockSums, allowAdd: false },
      { key: 'completed', label: '작업완료', columns: columnsForStatus('작업완료'), sums: productionStockSums, allowAdd: false },
    ]
  }
  if (props.mode === 'out' || props.mode === 'summary') {
    return [
      { key: 'out', label: '산출', columns: props.outboundColumns, sums: standardSums, allowAdd: true },
    ]
  }
  return []
})

const blockTableStyle = (columns) => ({
  minWidth: `${OUT_SUM_BLOCK_PX + labelColumnWidths.value.labelBlockWidth + Math.max(columns.length, 1) * 100}px`,
  '--group-col': `${labelColumnWidths.value.groupColWidth}px`,
  '--spec-col': `${labelColumnWidths.value.specColWidth}px`,
  '--label-left': `${OUT_SUM_BLOCK_PX}px`,
  '--sub-left': `${OUT_SUM_BLOCK_PX + labelColumnWidths.value.groupColWidth}px`,
})

const blockSummaryValue = (row, field) => {
  if (!field) return null
  return row.collapsed ? groupField(row, field) : summaries.value[row.id]?.[field]
}

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
const labelColumnWidths = computed(() => buildSheetLabelColumnWidths(props.materials))
const inMinWidth = computed(() => IN_SUM_BLOCK_PX + labelColumnWidths.value.labelBlockWidth + Math.max(inCount.value, 1) * 100)

const inboundTableStyle = computed(() => ({
  minWidth: `${inMinWidth.value}px`,
  '--group-col': `${labelColumnWidths.value.groupColWidth}px`,
  '--spec-col': `${labelColumnWidths.value.specColWidth}px`,
  '--label-left': `${IN_SUM_BLOCK_PX}px`,
  '--sub-left': `${IN_SUM_BLOCK_PX + labelColumnWidths.value.groupColWidth}px`,
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
const inboundNavRows = computed(() => {
  if (props.mode === 'production') return []
  return buildSheetNavRows({
    side: 'in',
    headerKeys: inHeaderRows.map((row) => row.key),
    columns: props.inboundColumns,
    materialIds: navMaterialIds.value,
  })
})
const outboundNavRows = computed(() =>
  buildSheetNavRows({
    side: 'out',
    headerKeys: outHeaderRows.map((row) => row.key),
    columns: outboundBlocks.value.flatMap((block) => block.columns),
    materialIds: navMaterialIds.value,
  }),
)

const dateDialog = ref(null)

const dateDialogIso = computed(() => String(dateDialog.value?.column?.transactionDate ?? '').trim())

const openDateDialog = (side, column) => {
  emit('start-edit', { side, column, field: 'date' })
  dateDialog.value = { side, column }
}

const closeDateDialog = () => {
  const target = dateDialog.value
  dateDialog.value = null
  if (!target) return
  emit('cancel-edit', { side: target.side, column: target.column, field: 'date' })
}

const applyDateDialog = (value) => {
  const target = dateDialog.value
  if (!target) return
  dateDialog.value = null
  onHeaderInput(target.column, 'date', value)
  emit('commit-edit', { side: target.side, column: target.column, field: 'date' })
}

const focusSheetCell = (editKey) => {
  const input = sheetRoot.value?.querySelector(`[data-edit-key="${CSS.escape(editKey)}"]`)
  if (!input) return
  input.focus()
  if (typeof input.select === 'function' && input.tagName !== 'BUTTON') input.select()
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
      <div v-if="mode === 'in' || mode === 'summary'" class="sheet-block">
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
              <InventorySheetDateCell
                v-if="headerRow.key === 'date'"
                :model-value="headerValue(column, 'date')"
                :edit-key="cellKey('in', column, 'date')"
                @open="openDateDialog('in', column)"
                @navigate="onNavigate(cellKey('in', column, 'date'), $event)"
              />
              <InventorySheetCell
                v-else
                :model-value="headerValue(column, headerRow.key)"
                input-type="text"
                :clamp="headerRow.key === 'memo'"
                :edit-key="cellKey('in', column, headerRow.key)"
                @start="emit('start-edit', { side: 'in', column, field: headerRow.key })"
                @update:model-value="onHeaderInput(column, headerRow.key, $event)"
                @commit="emit('commit-edit', { side: 'in', column, field: headerRow.key })"
                @cancel="emit('cancel-edit', { side: 'in', column, field: headerRow.key })"
                @navigate="onNavigate(cellKey('in', column, headerRow.key), $event)"
              />
            </td>
          </tr>

          <tr v-for="row in visibleMaterialRows" :key="`in-${row.id}`" class="in-row">
            <td class="sticky-col s-0 sum-cell sum-in" :class="quantityClass(row.collapsed ? groupField(row, 'inbound') : summaries[row.id]?.inbound)">
              {{ formatBlankZero(row.collapsed ? groupField(row, 'inbound') : summaries[row.id]?.inbound) }}
            </td>
            <td class="sticky-col s-64 sum-cell sum-out" :class="quantityClass(row.collapsed ? groupField(row, 'outbound') : summaries[row.id]?.outbound)">
              {{ formatBlankZero(row.collapsed ? groupField(row, 'outbound') : summaries[row.id]?.outbound) }}
            </td>
            <td
              class="sticky-col s-128 sum-cell sum-net"
              :class="quantityClass(row.collapsed ? groupField(row, 'inboundNet') : summaries[row.id]?.inboundNet, { showZero: true })"
            >
              {{ formatQuantity(row.collapsed ? groupField(row, 'inboundNet') : summaries[row.id]?.inboundNet) }}
            </td>
            <template v-if="row.collapsed">
              <td colspan="2" class="sticky-col s-label spec-cell s-edge group-cell">
                <InventorySheetGroupCell :label="row.group" collapsed @toggle="toggleGroup(row.group)" />
              </td>
            </template>
            <template v-else-if="!row.group">
              <td colspan="2" class="sticky-col s-label spec-cell s-edge">{{ row.spec }}</td>
            </template>
            <template v-else>
              <td
                v-if="row.renderSpecCell"
                :rowspan="row.groupRowspan"
                class="sticky-col s-label spec-cell group-cell"
              >
                <InventorySheetGroupCell :label="row.group" @toggle="toggleGroup(row.group)" />
              </td>
              <td class="sticky-col s-sub spec-cell s-edge">{{ row.spec }}</td>
            </template>
            <td
              v-for="column in inboundColumns"
              :key="`in-${row.id}-${column.localId}`"
              class="qty-cell"
              :class="[quantityClass(row.collapsed ? groupColumnValue(column, row) : quantityOf(column, row.id)), row.groupTone]"
            >
              <template v-if="row.collapsed">
                {{ formatBlankZero(groupColumnValue(column, row)) }}
              </template>
              <InventorySheetCell
                v-else
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

      <div v-for="block in outboundBlocks" :key="block.key" class="sheet-block">
      <table class="ui-sheet sheet-out" :style="blockTableStyle(block.columns)">
        <colgroup>
          <col class="col-sum" />
          <col class="col-sum" />
          <col class="col-sum" />
          <col class="col-spec" />
          <col class="col-sub" />
          <col v-for="column in block.columns" :key="`${block.key}-col-${column.localId}`" class="col-event" />
        </colgroup>
        <tbody>
          <tr class="section-row section-out top-stick t-0">
            <td colspan="3" class="sticky-col s-0 section-cell">{{ block.label }}</td>
            <td :colspan="Math.max(block.columns.length, 1) + 2" class="section-cell"></td>
          </tr>

          <tr
            v-for="(headerRow, headerIndex) in outHeaderRows"
            :key="`${block.key}-${headerRow.key}`"
            class="out-row head-row top-stick"
            :class="topClassByKey[headerRow.key]"
          >
            <template v-if="headerIndex === 0">
              <th
                v-for="sum in block.sums"
                :key="`${block.key}-head-${sum.key}`"
                :rowspan="outHeaderRows.length"
                class="sticky-col sum-head"
                :class="[sum.stickyClass, sum.cellClass]"
              >
                {{ sum.label }}
              </th>
            </template>
            <th colspan="2" class="sticky-col s-label s-edge label-cell">{{ headerRow.label }}</th>
            <td
              v-for="column in block.columns"
              :key="`${block.key}-${headerRow.key}-${column.localId}`"
              class="head-value"
              :class="headerRow.key === 'memo' ? ['cell-memo', outboundMemoClass(column)] : ''"
            >
              <InventorySheetDateCell
                v-if="headerRow.key === 'date'"
                :model-value="headerValue(column, 'date')"
                :edit-key="cellKey('out', column, 'date')"
                @open="openDateDialog(columnSide, column)"
                @navigate="onNavigate(cellKey('out', column, 'date'), $event)"
              />
              <InventorySheetCell
                v-else
                :model-value="headerRow.key === 'memo' ? outboundMemoValue(column) : headerValue(column, headerRow.key)"
                input-type="text"
                :multiline="headerRow.key === 'memo'"
                :edit-key="cellKey('out', column, headerRow.key)"
                @start="emit('start-edit', { side: columnSide, column, field: headerRow.key })"
                @update:model-value="headerRow.key === 'memo' ? onOutboundMemoInput(column, $event) : onHeaderInput(column, headerRow.key, $event)"
                @commit="emit('commit-edit', { side: columnSide, column, field: headerRow.key })"
                @cancel="emit('cancel-edit', { side: columnSide, column, field: headerRow.key })"
                @navigate="onNavigate(cellKey('out', column, headerRow.key), $event)"
              />
            </td>
          </tr>

          <tr v-for="row in visibleMaterialRows" :key="`${block.key}-${row.id}`" class="out-row">
            <td
              v-for="sum in block.sums"
              :key="`${block.key}-${row.id}-${sum.key}`"
              class="sticky-col sum-cell"
              :class="[sum.stickyClass, sum.cellClass, quantityClass(blockSummaryValue(row, sum.field), { showZero: Boolean(sum.showZero) })]"
            >
              <template v-if="sum.field">
                {{ sum.blankZero ? formatBlankZero(blockSummaryValue(row, sum.field)) : formatQuantity(blockSummaryValue(row, sum.field)) }}
              </template>
            </td>
            <template v-if="row.collapsed">
              <td colspan="2" class="sticky-col s-label spec-cell s-edge group-cell">
                <InventorySheetGroupCell :label="row.group" collapsed @toggle="toggleGroup(row.group)" />
              </td>
            </template>
            <template v-else-if="!row.group">
              <td colspan="2" class="sticky-col s-label spec-cell s-edge">{{ row.spec }}</td>
            </template>
            <template v-else>
              <td
                v-if="row.renderSpecCell"
                :rowspan="row.groupRowspan"
                class="sticky-col s-label spec-cell group-cell"
              >
                <InventorySheetGroupCell :label="row.group" @toggle="toggleGroup(row.group)" />
              </td>
              <td class="sticky-col s-sub spec-cell s-edge">{{ row.spec }}</td>
            </template>
            <td
              v-for="column in block.columns"
              :key="`${block.key}-${row.id}-${column.localId}`"
              class="qty-cell"
              :class="[quantityClass(row.collapsed ? groupColumnValue(column, row) : quantityOf(column, row.id)), row.groupTone]"
            >
              <template v-if="row.collapsed">
                {{ formatBlankZero(groupColumnValue(column, row)) }}
              </template>
              <InventorySheetCell
                v-else
                :model-value="quantityValue(column, row.id)"
                input-type="number"
                :edit-key="cellKey('out', column, 'quantity', row.id)"
                :text-class="quantityClass(quantityValue(column, row.id))"
                @start="emit('start-edit', { side: columnSide, column, field: 'quantity', materialId: row.id })"
                @update:model-value="onQuantityInput(column, row.id, $event)"
                @commit="emit('commit-edit', { side: columnSide, column, field: 'quantity', materialId: row.id })"
                @cancel="emit('cancel-edit', { side: columnSide, column, field: 'quantity', materialId: row.id })"
                @navigate="onNavigate(cellKey('out', column, 'quantity', row.id), $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="block.allowAdd" class="add-rail">
        <button type="button" class="add-column" aria-label="추가" :style="{ top: addButtonTop }" @click="emit('add-column', columnSide)">+</button>
      </div>
      </div>
    </div>
    <InventorySheetDateDialog
      :open="Boolean(dateDialog)"
      :value="dateDialogIso"
      @close="closeDateDialog"
      @select="applyDateDialog"
      @delete="applyDateDialog('')"
    />
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
