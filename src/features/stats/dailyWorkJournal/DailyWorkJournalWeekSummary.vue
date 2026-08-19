<script setup>
defineProps({
  items: { type: Array, required: true },
  qtyUnit: { type: String, default: '헤드' },
  showInch: { type: Boolean, default: false },
})

function qtyText(qty) {
  const n = Number(qty || 0)
  return n > 0 ? n.toLocaleString('ko-KR') : ''
}
</script>

<template>
  <section class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table class="min-w-full border-collapse text-sm">
      <thead class="bg-slate-50">
        <tr>
          <th class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700"></th>
          <th
            v-for="item in items"
            :key="item.key"
            class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700"
            :class="item.isSelected ? 'bg-slate-200' : ''"
          >
            {{ item.weekday }} {{ item.dateLabel }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">{{ qtyUnit }}</td>
          <td
            v-for="item in items"
            :key="`${item.key}-qty`"
            class="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-900"
            :class="item.isSelected ? 'bg-slate-50' : ''"
          >
            {{ qtyText(item.qty) }}
          </td>
        </tr>
        <tr v-if="showInch">
          <td class="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">인치</td>
          <td
            v-for="item in items"
            :key="`${item.key}-inch`"
            class="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-900"
            :class="item.isSelected ? 'bg-slate-50' : ''"
          >
            {{ qtyText(item.inch) }}
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
