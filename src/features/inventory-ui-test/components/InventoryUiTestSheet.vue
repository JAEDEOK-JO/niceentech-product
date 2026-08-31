<script setup>
import { inboundColumns, materials, outboundColumns, siteMeta } from '../dummyData'
import { buildMaterialRows, buildSummaries, formatBlankZero, formatQuantity, quantityClass } from '../sheetFormat'

const materialRows = buildMaterialRows(materials)
const summaries = buildSummaries(materials, inboundColumns, outboundColumns)

const eventCount = Math.max(outboundColumns.length, inboundColumns.length)
const eventIndexes = Array.from({ length: eventCount }, (_, i) => i)
const totalColspan = 5 + eventCount
const minWidth = 192 + 120 + eventCount * 100

const outHeaderRows = [
  { key: 'date', label: '일자' },
  { key: 'memo', label: '내역' },
]

const inHeaderRows = [
  { key: 'date', label: '일자' },
  { key: 'memo', label: '내역' },
  { key: 'manufacturer', label: '제조사' },
  { key: 'supplier', label: '입고처' },
]

const topClassByKey = {
  date: 't-36',
  memo: 'row-memo t-66',
  manufacturer: 't-136',
  supplier: 't-166',
}

const metaItems = [
  { label: '설비사', value: siteMeta.vendor },
  { label: '현장', value: siteMeta.site },
  { label: '승인자재', value: siteMeta.approvedMaterials },
]

const headerText = (column, key) => {
  if (!column) return ''
  if (key === 'date') return `${column.year}.${column.month}.${column.day}`
  const value = column[key]
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

const quantityOf = (column, materialId) => column?.quantities?.[materialId]
</script>

<template>
  <section class="min-h-0 flex-1 overflow-hidden border border-slate-200 bg-white">
    <div class="sheet-scroll">
      <table class="ui-sheet" :style="{ minWidth: `${minWidth}px` }">
        <colgroup>
          <col class="col-sum" />
          <col class="col-sum" />
          <col class="col-sum" />
          <col class="col-spec" />
          <col class="col-sub" />
          <col v-for="i in eventIndexes" :key="`col-${i}`" class="col-event" />
        </colgroup>
        <tbody>
          <tr class="section-row section-out top-stick t-0">
            <td colspan="3" class="sticky-col s-0 section-cell">산출</td>
            <td :colspan="totalColspan - 3" class="section-cell"></td>
          </tr>

          <tr
            v-for="(headerRow, headerIndex) in outHeaderRows"
            :key="`out-${headerRow.key}`"
            class="out-row head-row top-stick"
            :class="topClassByKey[headerRow.key]"
          >
            <th
              v-if="headerIndex === 0"
              :rowspan="outHeaderRows.length"
              colspan="3"
              class="sticky-col s-0 meta-block"
            >
              <div class="meta-list">
                <div v-for="item in metaItems" :key="item.label" class="meta-item">
                  <span class="meta-label">{{ item.label }}</span>
                  <span class="meta-text">{{ item.value }}</span>
                </div>
              </div>
            </th>
            <th colspan="2" class="sticky-col s-label s-edge label-cell">{{ headerRow.label }}</th>
            <td
              v-for="i in eventIndexes"
              :key="`out-${headerRow.key}-${i}`"
              class="head-value"
              :class="headerRow.key === 'memo' ? 'cell-memo' : ''"
            >
              <span v-if="headerRow.key === 'memo'" class="memo-text">{{ headerText(outboundColumns[i], headerRow.key) }}</span>
              <template v-else>{{ headerText(outboundColumns[i], headerRow.key) }}</template>
            </td>
          </tr>

          <tr v-for="(row, rowIndex) in materialRows" :key="`out-${row.id}`" class="out-row">
            <td
              v-if="rowIndex === 0"
              :rowspan="materialRows.length"
              colspan="3"
              class="sticky-col s-0 blank-sum"
            ></td>
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
              v-for="i in eventIndexes"
              :key="`out-${row.id}-${i}`"
              class="qty-cell"
              :class="[quantityClass(quantityOf(outboundColumns[i], row.id)), row.groupTone]"
            >
              {{ formatQuantity(quantityOf(outboundColumns[i], row.id)) }}
            </td>
          </tr>

        </tbody>
      </table>

      <table class="ui-sheet sheet-in" :style="{ minWidth: `${minWidth}px` }">
        <colgroup>
          <col class="col-sum" />
          <col class="col-sum" />
          <col class="col-sum" />
          <col class="col-spec" />
          <col class="col-sub" />
          <col v-for="i in eventIndexes" :key="`col-in-${i}`" class="col-event" />
        </colgroup>
        <tbody>
          <tr class="section-row section-in top-stick t-0">
            <td colspan="3" class="sticky-col s-0 section-cell">입고</td>
            <td :colspan="totalColspan - 3" class="section-cell"></td>
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
              v-for="i in eventIndexes"
              :key="`in-${headerRow.key}-${i}`"
              class="head-value"
              :class="headerRow.key === 'memo' ? 'cell-memo' : ''"
            >
              <span v-if="headerRow.key === 'memo'" class="memo-text">{{ headerText(inboundColumns[i], headerRow.key) }}</span>
              <template v-else>{{ headerText(inboundColumns[i], headerRow.key) }}</template>
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
              v-for="i in eventIndexes"
              :key="`in-${row.id}-${i}`"
              class="qty-cell"
              :class="[quantityClass(quantityOf(inboundColumns[i], row.id)), row.groupTone]"
            >
              {{ formatQuantity(quantityOf(inboundColumns[i], row.id)) }}
            </td>
          </tr>
        </tbody>
      </table>
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

.sticky-col {
  position: sticky;
  z-index: 3;
}

.s-0 { left: 0; }
.s-64 { left: 64px; }
.s-128 { left: 128px; }
.s-label { left: 192px; }
.s-sub { left: 264px; }

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
.ui-sheet .t-136 th,
.ui-sheet .t-136 td { top: 136px; }
.ui-sheet .t-166 th,
.ui-sheet .t-166 td { top: 166px; }

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

.ui-sheet .meta-block {
  background: #fff;
  padding: 6px 10px;
  vertical-align: top;
}

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.meta-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.meta-label {
  flex-shrink: 0;
  width: 48px;
  font-size: 10px;
  font-weight: 900;
  color: #94a3b8;
}

.meta-text {
  font-size: 11px;
  font-weight: 800;
  color: #0f172a;
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

.ui-sheet .blank-sum {
  background: #fcfcfd;
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

.row-memo th,
.row-memo td {
  height: 70px;
}

.cell-memo {
  padding: 4px;
}

.memo-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: center;
}

.ui-sheet.sheet-in {
  margin-top: 18px;
}

.qty-cell {
  background: #fff;
}

.ui-sheet .qty-cell.tone-0 { background: #fff; }
.ui-sheet .qty-cell.tone-1 { background: #fffbeb; }
.ui-sheet .qty-cell.tone-2 { background: #f0f9ff; }

.ui-sheet .is-minus { color: #dc2626; }
.ui-sheet .is-plus,
.ui-sheet .is-zero { color: #0f172a; }
.ui-sheet .is-empty { color: #cbd5e1; }
</style>
