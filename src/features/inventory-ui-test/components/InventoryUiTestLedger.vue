<script setup>
import { materials, transactions } from '../dummyData'
import { formatQuantity, quantityClass } from '../sheetFormat'

const materialGroups = []
for (const item of materials) {
  const name = item.group || '기타'
  let group = materialGroups.find((target) => target.name === name)
  if (!group) {
    group = { name, items: [] }
    materialGroups.push(group)
  }
  group.items.push(item)
}

const flatMaterials = materialGroups.flatMap((group) =>
  group.items.map((item, index) => ({ ...item, groupStart: index === 0 })),
)

const summaryOf = (materialId) => {
  let inbound = 0
  let outbound = 0
  for (const transaction of transactions) {
    const value = Number(transaction.quantities?.[materialId] ?? 0)
    if (value > 0) inbound += value
    else if (value < 0) outbound += value
  }
  return { inbound, outbound, net: inbound + outbound }
}

const summaries = Object.fromEntries(materials.map((item) => [item.id, summaryOf(item.id)]))

const summaryCards = materials.map((item) => ({
  id: item.id,
  label: item.group ? `${item.group} ${item.spec}` : item.spec,
  ...summaries[item.id],
}))

const formatDate = (transaction) => `${transaction.year}.${transaction.month}.${transaction.day}`
</script>

<template>
  <div class="flex flex-col gap-3">
    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h2 class="text-sm font-extrabold text-slate-900">규격별 합산</h2>
        <span class="text-xs font-bold text-slate-400">{{ transactions.length }}건 기준</span>
      </div>
      <div class="grid grid-cols-3 gap-1.5 p-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
        <div v-for="card in summaryCards" :key="card.id" class="rounded-lg border border-slate-200 px-2 py-1.5">
          <p class="truncate text-[11px] font-extrabold text-slate-400">{{ card.label }}</p>
          <p class="mt-0.5 text-base font-black" :class="card.net < 0 ? 'text-red-600' : 'text-slate-900'">
            {{ formatQuantity(card.net) || 0 }}
          </p>
          <p class="mt-0.5 text-[10px] font-bold text-slate-400">
            입고 {{ formatQuantity(card.inbound) || 0 }} · 산출 {{ formatQuantity(card.outbound) || 0 }}
          </p>
        </div>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="ledger-scroll">
        <table class="ledger-table">
          <colgroup>
            <col class="col-no" />
            <col class="col-date" />
            <col class="col-type" />
            <col class="col-memo" />
            <col class="col-maker" />
            <col class="col-supplier" />
            <col v-for="item in flatMaterials" :key="item.id" class="col-qty" />
          </colgroup>
          <thead>
            <tr>
              <th rowspan="2" class="sticky-col l-no">No</th>
              <th rowspan="2" class="sticky-col l-date">일자</th>
              <th rowspan="2" class="sticky-col l-type">구분</th>
              <th rowspan="2" class="sticky-col l-memo">내역</th>
              <th rowspan="2" class="sticky-col l-maker">제조사</th>
              <th rowspan="2" class="sticky-col l-supplier l-edge">입고처/출고처</th>
              <th
                v-for="group in materialGroups"
                :key="group.name"
                :colspan="group.items.length"
                class="group-head group-start"
              >
                {{ group.name }}
              </th>
            </tr>
            <tr>
              <th
                v-for="item in flatMaterials"
                :key="item.id"
                class="spec-head"
                :class="item.groupStart ? 'group-start' : ''"
              >
                {{ item.spec }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(transaction, index) in transactions" :key="transaction.id">
              <td class="sticky-col l-no num-cell">{{ index + 1 }}</td>
              <td class="sticky-col l-date">{{ formatDate(transaction) }}</td>
              <td class="sticky-col l-type">
                <span class="type-badge" :class="transaction.type === 'in' ? 'type-in' : 'type-out'">
                  {{ transaction.type === 'in' ? '입고' : '산출' }}
                </span>
              </td>
              <td class="sticky-col l-memo memo-cell">{{ transaction.memo }}</td>
              <td class="sticky-col l-maker">{{ transaction.manufacturer }}</td>
              <td class="sticky-col l-supplier l-edge">{{ transaction.supplier }}</td>
              <td
                v-for="item in flatMaterials"
                :key="item.id"
                :class="[quantityClass(transaction.quantities?.[item.id]), item.groupStart ? 'group-start' : '']"
              >
                {{ formatQuantity(transaction.quantities?.[item.id]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ledger-scroll {
  overflow: auto;
  max-height: calc(100vh - 340px);
  min-height: 320px;
  overscroll-behavior-x: contain;
}

.ledger-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.ledger-table th,
.ledger-table td {
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  padding: 4px 6px;
  height: 34px;
  text-align: center;
  vertical-align: middle;
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
  background: #fff;
}

.ledger-table thead th {
  position: sticky;
  z-index: 4;
  background: #f8fafc;
  color: #475569;
  font-size: 11px;
  font-weight: 900;
  height: 28px;
}

.ledger-table thead tr:nth-child(1) th { top: 0; }
.ledger-table thead tr:nth-child(2) th { top: 28px; }

.col-no { width: 40px; }
.col-date { width: 76px; }
.col-type { width: 64px; }
.col-memo { width: 220px; }
.col-maker { width: 90px; }
.col-supplier { width: 110px; }
.col-qty { width: 64px; }

.sticky-col {
  position: sticky;
  z-index: 3;
}

.ledger-table thead .sticky-col {
  z-index: 8;
}

.l-no { left: 0; }
.l-date { left: 40px; }
.l-type { left: 116px; }
.l-memo { left: 180px; }
.l-maker { left: 400px; }
.l-supplier { left: 490px; }

.l-edge {
  box-shadow: 1px 0 0 #cbd5e1, 4px 0 8px -4px rgb(15 23 42 / 0.12);
}

.spec-head {
  color: #0f172a;
}

.group-head {
  color: #0f172a;
}

.ledger-table .group-start {
  border-left: 1px solid #94a3b8;
}

.num-cell {
  color: #94a3b8;
  font-size: 11px;
}

.memo-cell {
  text-align: left;
  font-size: 11px;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 900;
}

.type-in {
  background: #eff6ff;
  color: #1d4ed8;
}

.type-out {
  background: #fff1f2;
  color: #be123c;
}

.is-minus { color: #dc2626; }
.is-plus { color: #0f172a; }
.is-empty { color: #cbd5e1; }
</style>
