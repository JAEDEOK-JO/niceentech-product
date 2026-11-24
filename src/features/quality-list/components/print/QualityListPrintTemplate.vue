<script setup lang="ts">
import { computed } from 'vue'
import { QUALITY_COUNT_COLUMNS } from '../../utils/countColumns'
import { manualExpansionLabel } from '../../utils/manualExpansion'
import { chunkQualityListPages, qualityListPageOffset } from '../../utils/print/listPages'
import type { QualityListRow } from '../../types/quality'

const props = defineProps<{
  items: QualityListRow[]
  title: string
  total: number
  active: boolean
  showDate: boolean
}>()

const pages = computed(() => chunkQualityListPages(props.items))

function lotRoundStyle(round: string) {
  if (round === '2차') return { color: '#ea580c' }
  if (round === '3차') return { color: '#16a34a' }
  if (round === '4차') return { color: '#7c3aed' }
  return { color: '#111827' }
}

function quantity(item: QualityListRow, key: keyof QualityListRow) {
  return Number(item[key] ?? 0)
}
</script>

<template>
  <section class="quality-list-print" :class="{ 'is-print-active': active }">
    <div
      v-for="(page, pageIndex) in pages"
      :key="pageIndex"
      class="quality-print-sheet"
      :class="{ 'is-last': pageIndex === pages.length - 1 }"
    >
      <table class="quality-print-table">
        <colgroup>
          <col class="quality-print-col-n" />
          <col class="quality-print-col-initial" />
          <col class="quality-print-col-place" />
          <col class="quality-print-col-lot" />
          <col v-for="column in QUALITY_COUNT_COLUMNS" :key="column.field" class="quality-print-col-count" />
          <col class="quality-print-col-total" />
        </colgroup>
        <thead>
          <tr v-if="pageIndex === 0" class="quality-print-title-row">
            <th colspan="15">
              <span class="quality-print-title-label">{{ title }} 검수리스트</span>
              <span class="quality-print-title-total">총합 : {{ total }}개</span>
            </th>
          </tr>
          <tr>
            <th class="quality-print-base">N</th>
            <th class="quality-print-base">도번</th>
            <th class="quality-print-base">현장명</th>
            <th class="quality-print-base">확관</th>
            <th
              v-for="column in QUALITY_COUNT_COLUMNS"
              :key="column.field"
              :class="column.metric ? 'quality-print-metric' : 'quality-print-inch'"
            >
              {{ column.label }}
            </th>
            <th class="quality-print-base">합계</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="page.length === 0">
            <td colspan="15">검수리스트가 없습니다.</td>
          </tr>
          <tr v-for="(item, index) in page" :key="item.id">
            <td class="quality-print-n">{{ qualityListPageOffset(pageIndex) + index + 1 }}</td>
            <td class="quality-print-initial">
              <span class="quality-print-initial-text">{{ item.initial }}</span>
            </td>
            <td class="quality-print-place">
              <div class="quality-print-place-wrap">
                <span class="quality-print-place-text">
                  {{ item.company }} {{ item.place }}{{ item.area ? ' ' + item.area : '' }}
                  <span v-if="showDate && item.testDate" class="quality-print-date">({{ item.testDate.replace(/\s/g, '').slice(2) }})</span>
                </span>
              </div>
            </td>
            <td class="quality-print-lot">
              <div class="quality-print-lot-stack">
                <div class="quality-print-lot-inner" :style="lotRoundStyle(item.lotRound)">
                  <span>({{ item.lotNumH ? String(item.lotNumH).slice(-3) : '---' }})</span>
                  <strong>{{ item.lotNameH || '-' }}</strong>
                  <span>{{ item.lotNumStartH || '' }} ~ {{ item.lotNumEndH || '' }}</span>
                </div>
                <div v-if="manualExpansionLabel(item)" class="quality-print-lot-manual">{{ manualExpansionLabel(item) }}</div>
              </div>
            </td>
            <td
              v-for="column in QUALITY_COUNT_COLUMNS"
              :key="column.field"
              :class="[
                column.metric ? 'quality-print-metric' : 'quality-print-inch',
                { 'quality-print-return': Boolean(item[column.returnKey]) },
              ]"
            >
              <div class="quality-print-count">
                <strong v-if="quantity(item, column.valueKey) > 0">{{ quantity(item, column.valueKey) }}</strong>
                <em v-if="quantity(item, column.cancelKey) > 0">{{ quantity(item, column.cancelKey) }}</em>
              </div>
            </td>
            <td class="quality-print-total">{{ item.totalH || '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.quality-list-print {
  display: none;
}

@media print {
  .quality-list-print.is-print-active {
    display: block !important;
    color: #111827;
    font-family: TheJamsil, sans-serif !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .quality-list-print.is-print-active,
  .quality-list-print.is-print-active * {
    font-family: TheJamsil, sans-serif !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .quality-print-sheet {
    break-after: page;
    page-break-after: always;
  }

  .quality-print-sheet.is-last {
    break-after: auto;
    page-break-after: auto;
  }

  .quality-print-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
  }

  .quality-print-col-n {
    width: 32px;
  }

  .quality-print-col-initial {
    width: 72px;
  }

  .quality-print-col-place {
    width: auto;
  }

  .quality-print-col-lot {
    width: 160px;
  }

  .quality-print-col-count {
    width: 50px;
  }

  .quality-print-col-total {
    width: 48px;
  }

  .quality-print-table th,
  .quality-print-table td {
    border-right: 1px solid #94a3b8;
    border-bottom: 1px solid #94a3b8;
    padding: 0 2px;
    text-align: center;
    vertical-align: middle;
  }

  .quality-print-table th:first-child,
  .quality-print-table td:first-child {
    border-left: 1px solid #94a3b8;
  }

  .quality-print-table thead th {
    height: 28px;
    border-top: 1px solid #94a3b8;
    border-right: 1px solid #64748b;
    border-bottom: 2px solid #475569;
    color: #1e3a8a;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .quality-print-table thead .quality-print-title-row th,
  .quality-print-table thead .quality-print-title-row th:first-child {
    height: auto;
    padding: 0 0 4px;
    border: 0;
    background: transparent;
    color: #000;
    font-size: 18px;
    font-weight: 800;
    line-height: 1.2;
    text-align: left;
    white-space: nowrap;
  }

  .quality-print-title-label {
    color: #000;
  }

  .quality-print-title-total {
    margin-left: 0.4em;
    color: #ea580c;
  }

  .quality-print-base {
    background: #eff6ff;
  }

  .quality-print-inch {
    background: #dbeafe;
  }

  .quality-print-metric {
    background: #ffedd5;
    color: #7c2d12;
  }

  .quality-print-table tbody tr {
    height: 40px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .quality-print-table tbody td {
    height: 40px;
    max-height: 40px;
    overflow: hidden;
  }

  .quality-print-table tbody td.quality-print-lot {
    overflow: visible;
  }

  .quality-print-n,
  .quality-print-total {
    padding: 0 4px !important;
    font-weight: 800;
  }

  .quality-print-initial {
    padding: 2px !important;
    color: #334155;
    font-size: 12px;
    font-weight: 700;
    vertical-align: middle;
  }

  .quality-print-initial-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    word-break: break-all;
    line-height: 1.2;
    max-height: calc(1.2em * 2);
  }

  .quality-print-place {
    padding: 0 4px !important;
    color: #0f172a;
    font-size: 12px;
    font-weight: 700;
    text-align: left !important;
    vertical-align: middle;
  }

  .quality-print-place-wrap {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 100%;
  }

  .quality-print-place-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    word-break: keep-all;
    line-height: 1.2;
    max-height: calc(1.2em * 2);
    text-align: left;
    width: 100%;
  }

  .quality-print-date {
    color: #ea580c;
    white-space: nowrap;
  }

  .quality-print-lot {
    padding: 0 8px !important;
    white-space: nowrap;
    overflow: visible;
  }

  .quality-print-lot-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
  }

  .quality-print-lot-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    white-space: nowrap;
  }

  .quality-print-lot-manual {
    font-size: 10px;
    font-weight: 700;
    line-height: 1.1;
    white-space: nowrap;
  }

  .quality-print-lot-inner strong {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 800;
  }

  .quality-print-lot-inner span {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
  }

  .quality-print-table tbody .quality-print-inch {
    background: #fff;
    color: #111827;
  }

  .quality-print-table tbody .quality-print-metric {
    background: #fff7ed;
    color: #111827;
  }

  .quality-print-count {
    display: flex;
    height: 40px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.05;
  }

  .quality-print-count strong {
    font-size: 13px;
    font-weight: 800;
  }

  .quality-print-count em {
    color: #dc2626;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
    line-height: 1;
  }

  .quality-print-return,
  .quality-print-table tbody td.quality-print-return {
    background: #ef4444 !important;
    color: #fff !important;
  }

  .quality-print-return .quality-print-count em {
    color: #fff;
  }
}
</style>
