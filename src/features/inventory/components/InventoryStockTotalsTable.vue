<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const groupedRows = computed(() => {
  const groups = []
  for (const row of props.rows ?? []) {
    const groupName = String(row.material?.material_group || row.material?.name || '기타')
    let group = groups.find((target) => target.name === groupName)
    if (!group) {
      group = { name: groupName, rows: [] }
      groups.push(group)
    }
    group.rows.push(row)
  }
  return groups
})

const summaryRows = [
  { label: '합계', key: 'quantity' },
  { label: '입고합계', key: 'incomingQuantity' },
  { label: '출고합계', key: 'outgoingQuantity' },
]

const formatQuantity = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number) || number === 0) return ''
  return number.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

const quantityClass = (value) => {
  const number = Number(value || 0)
  if (number < 0) return 'text-red-600'
  if (number > 0) return 'text-slate-950'
  return 'text-slate-300'
}

const isGroupStart = (index) => index === 0
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
      <h2 class="text-sm font-extrabold text-slate-900">{{ title }}</h2>
    </div>

    <div v-if="loading" class="px-4 py-8 text-center text-sm font-bold text-slate-500">
      재고를 불러오는 중입니다.
    </div>
    <div v-else class="stock-totals-scroll">
      <table class="stock-totals-table">
        <colgroup>
          <col class="summary-label-col" />
          <template v-for="group in groupedRows" :key="`col-${group.name}`">
            <col v-for="row in group.rows" :key="row.id" class="material-col" />
          </template>
        </colgroup>
        <thead>
          <tr>
            <th class="summary-label-header" rowspan="2">구분</th>
            <th
              v-for="(group, groupIndex) in groupedRows"
              :key="group.name"
              :colspan="group.rows.length"
              class="group-header"
              :class="{ 'group-divider': groupIndex > 0 }"
            >
              {{ group.name }}
            </th>
          </tr>
          <tr>
            <template v-for="(group, groupIndex) in groupedRows" :key="`${group.name}-items`">
              <th
                v-for="(row, rowIndex) in group.rows"
                :key="row.id"
                class="item-header"
                :class="{ 'group-divider': groupIndex > 0 && isGroupStart(rowIndex) }"
              >
                {{ row.material?.spec || row.label }}
              </th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr v-for="summary in summaryRows" :key="summary.key">
            <th class="summary-label">{{ summary.label }}</th>
            <template v-for="(group, groupIndex) in groupedRows" :key="`${summary.key}-${group.name}`">
              <td
                v-for="(row, rowIndex) in group.rows"
                :key="row.id"
                :class="[
                  quantityClass(row[summary.key]),
                  { 'group-divider': groupIndex > 0 && isGroupStart(rowIndex) },
                ]"
              >
                {{ formatQuantity(row[summary.key]) }}
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.stock-totals-scroll {
  overflow-x: auto;
  max-width: 100%;
  overscroll-behavior-x: contain;
}

.stock-totals-table {
  min-width: 100%;
  width: max-content;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.summary-label-col {
  width: 86px;
}

.material-col {
  width: 70px;
}

.stock-totals-table th,
.stock-totals-table td {
  height: 34px;
  border-right: 1px solid rgb(226 232 240);
  border-bottom: 1px solid rgb(226 232 240);
  padding: 4px 6px;
  text-align: center;
  vertical-align: middle;
}

.stock-totals-table thead th {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  font-size: 12px;
  font-weight: 900;
}

.summary-label-header,
.summary-label {
  position: sticky;
  left: 0;
  z-index: 5;
  width: 86px;
  min-width: 86px;
  background: rgb(248 250 252);
}

.summary-label-header {
  z-index: 8;
  box-shadow: 1px 0 0 rgb(226 232 240);
}

.summary-label {
  color: rgb(15 23 42);
  font-size: 12px;
  font-weight: 900;
  box-shadow: 1px 0 0 rgb(226 232 240);
}

.group-header {
  background: rgb(241 245 249) !important;
}

.item-header {
  width: 70px;
  min-width: 70px;
  background: rgb(248 250 252) !important;
}

.stock-totals-table td {
  width: 70px;
  min-width: 70px;
  background: white;
  font-size: 12px;
  font-weight: 900;
}

.group-divider {
  border-left: 1px solid rgb(17 24 39) !important;
}
</style>
