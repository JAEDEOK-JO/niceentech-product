<script setup lang="ts">
import { computed } from 'vue'
import type { PrintEntryWithType } from '../../types/print'
import { getMainPipeCardView } from '../../utils/print/main-pipe'

const props = defineProps<{
  card: PrintEntryWithType
}>()

const view = computed(() => getMainPipeCardView(props.card))
</script>

<template>
  <article class="main-pipe-card">
    <table class="card-table">
      <tbody>
        <tr class="card-head-row">
          <th class="yellow-bg">{{ view.indexLabel }}</th>
          <td class="yellow-bg card-initial">{{ view.initial }}</td>
        </tr>
        <tr class="card-text-row">
          <th>현장</th>
          <td class="card-place">
            <span class="card-data-clamp">{{ view.companyPlace }}</span>
          </td>
        </tr>
        <tr class="card-text-row">
          <th>구역</th>
          <td class="card-area">
            <span class="card-data-clamp">{{ view.area }}</span>
          </td>
        </tr>
        <tr class="card-lot-row">
          <th class="yellow-bg card-lot-head">
            <span>로트번호</span>
            <span v-if="view.lotCode" class="card-lot-code">{{ view.lotCode }}</span>
          </th>
          <td class="yellow-bg card-lot">{{ view.lotRange }}</td>
        </tr>
        <tr
          v-for="row in view.rows"
          :key="row.label"
          class="card-qty-row"
          :class="{ 'grey-bg': row.grey }"
        >
          <th>{{ row.label }}</th>
          <td class="card-qty">{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

<style scoped>
.main-pipe-card {
  min-height: 0;
  height: 100%;
}

.card-table {
  width: 100%;
  height: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.card-table th,
.card-table td {
  border: 1px solid #000;
  padding: 4px 8px;
  text-align: center;
  vertical-align: middle;
  font-weight: 700;
}

.card-table th {
  width: 32%;
  font-size: 15px;
}

.card-table td {
  font-size: 15px;
}

.yellow-bg {
  background: #ffff00;
}

.grey-bg th,
.grey-bg td {
  background: #e0e0e0;
}

.card-head-row {
  height: 36px;
}

.card-head-row th,
.card-head-row td {
  height: 36px;
  max-height: 36px;
  overflow: hidden;
}

.card-table td.card-initial {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.1;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card-table td.card-qty {
  font-size: 22px;
  font-weight: 800;
}

.card-lot-row th,
.card-lot-row td {
  height: auto;
}

.card-lot-head {
  line-height: 1.2;
}

.card-lot-code {
  display: block;
  margin-top: 2px;
  font-size: 13px;
  font-weight: 800;
}

.card-table td.card-lot {
  font-size: 16px;
  font-weight: 800;
  white-space: pre-line;
  word-break: keep-all;
}

.card-table td.card-place,
.card-table td.card-area {
  padding: 2px 6px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  vertical-align: middle;
}

.card-text-row th,
.card-text-row td {
  height: 40px;
  max-height: 40px;
}

.card-qty-row th,
.card-qty-row td {
  height: 44px;
}

.card-data-clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  word-break: keep-all;
  overflow-wrap: anywhere;
  line-height: 1.25;
  max-height: calc(1.25em * 2);
}
</style>
