<script setup lang="ts">
import type { BranchPipeItem } from '../../types/print'
import { BRANCH_SIZE_LABELS } from '../../types/print'
import {
  BRANCH_BUNDLE_PAIRS,
  formatBranchTotal,
  formatBundleValue,
} from '../../utils/print/branch-pipe'

defineProps<{
  pages: BranchPipeItem[][]
  active: boolean
}>()
</script>

<template>
  <section class="branch-pipe-print" :class="{ 'is-print-active': active }">
    <div
      v-for="(pageItems, pageIndex) in pages"
      :key="pageIndex"
      class="branch-pipe-sheet"
    >
      <article
        v-for="item in pageItems"
        :key="item.row.id"
        class="branch-pipe-card"
      >
        <header class="branch-pipe-header">
          <span class="header-accent">{{ item.originalIndex }}번</span>
          <span class="header-place">{{ item.row.company }} {{ item.row.place }}</span>
          <span class="header-accent">({{ item.row.initial }})</span>
        </header>
        <p class="branch-pipe-area">
          <span>{{ item.row.area }}</span>
          <span v-if="item.lotText" class="branch-pipe-lot">{{ item.lotText }}</span>
        </p>
        <div class="branch-bundle-wrap">
          <table class="branch-bundle-table">
            <thead>
              <tr>
                <th></th>
                <th v-for="label in BRANCH_SIZE_LABELS" :key="`l-${label}`" class="size-cell">{{ label }}</th>
                <th></th>
                <th v-for="label in BRANCH_SIZE_LABELS" :key="`r-${label}`" class="size-cell">{{ label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(pair, pairIndex) in BRANCH_BUNDLE_PAIRS"
                :key="pair.join('-')"
                :class="{ 'bundle-alt': pairIndex === 1 }"
              >
                <th>{{ pair[0] }}번다발</th>
                <td class="size-cell">{{ formatBundleValue(item.row, pair[0], 'a32') }}</td>
                <td class="size-cell">{{ formatBundleValue(item.row, pair[0], 'a40') }}</td>
                <td class="size-cell">{{ formatBundleValue(item.row, pair[0], 'a50') }}</td>
                <td class="size-cell">{{ formatBundleValue(item.row, pair[0], 'a65') }}</td>
                <th>{{ pair[1] }}번다발</th>
                <td class="size-cell">{{ formatBundleValue(item.row, pair[1], 'a32') }}</td>
                <td class="size-cell">{{ formatBundleValue(item.row, pair[1], 'a40') }}</td>
                <td class="size-cell">{{ formatBundleValue(item.row, pair[1], 'a50') }}</td>
                <td class="size-cell">{{ formatBundleValue(item.row, pair[1], 'a65') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="branch-total-wrap">
          <table class="branch-total-table">
            <tbody>
              <tr>
                <th rowspan="2" class="total-label">총합계</th>
                <th class="size-cell">A32</th>
                <th class="size-cell">A40</th>
                <th class="size-cell">A50</th>
                <th class="size-cell">A65</th>
              </tr>
              <tr>
                <td class="size-cell">{{ formatBranchTotal(item.row, 'a32') }}</td>
                <td class="size-cell">{{ formatBranchTotal(item.row, 'a40') }}</td>
                <td class="size-cell">{{ formatBranchTotal(item.row, 'a50') }}</td>
                <td class="size-cell">{{ formatBranchTotal(item.row, 'a65') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.branch-pipe-print {
  display: none;
}

@media print {
  .branch-pipe-print.is-print-active {
    display: block !important;
    color: #000;
    font-family: TheJamsil, sans-serif !important;
  }

  .branch-pipe-print.is-print-active,
  .branch-pipe-print.is-print-active * {
    font-family: TheJamsil, sans-serif !important;
  }

  .branch-pipe-sheet {
    box-sizing: border-box;
    width: 100%;
    height: 198mm;
    padding: 0 30px;
    page-break-after: always;
    break-after: page;
  }

  .branch-pipe-sheet:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .branch-pipe-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .branch-pipe-header {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin: 0 0 6px;
    font-size: 32px;
    font-weight: 800;
  }

  .header-accent {
    font-size: 36px;
    font-weight: 800;
    color: #dc2626;
  }

  .header-place {
    color: #000;
  }

  .branch-pipe-area {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 14px;
    margin: 0 0 10px;
    font-size: 32px;
    font-weight: 800;
  }

  .branch-pipe-lot {
    font-weight: 800;
    color: #ea580c;
  }

  .branch-bundle-wrap {
    flex: 1;
    min-height: 0;
  }

  .branch-bundle-table {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .branch-bundle-table th,
  .branch-bundle-table td {
    border: 1.5px solid #000;
    text-align: center;
    vertical-align: middle;
    font-size: 28px;
    font-weight: 800;
    background: #fff;
  }

  .branch-bundle-table td {
    font-size: 36px;
  }

  .branch-bundle-table thead th {
    height: 48px;
    font-size: 20px;
  }

  .branch-total-wrap {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }

  .branch-total-table {
    width: 62%;
    border-collapse: collapse;
    table-layout: fixed;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .branch-total-table th,
  .branch-total-table td {
    border: 1.5px solid #000;
    text-align: center;
    vertical-align: middle;
    font-size: 28px;
    font-weight: 800;
  }

  .branch-total-table th.size-cell {
    height: 59px;
  }

  .branch-total-table td {
    height: 117px;
    font-size: 45px;
  }

  .total-label {
    width: 22%;
    background: #fff;
    font-size: 28px;
  }

  th.size-cell {
    background: #ffe0b2;
  }

  td.size-cell {
    background: #fff;
  }

  .bundle-alt th,
  .bundle-alt td.size-cell {
    background: #fff7ed;
  }
}
</style>
