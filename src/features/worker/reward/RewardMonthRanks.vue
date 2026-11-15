<script setup>
defineProps({
  ranks: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <section v-if="ranks.length" class="mb-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
    <p class="text-xs font-extrabold text-slate-500">명예의 전당</p>
    <ol class="mt-2 space-y-1.5">
      <li v-for="(row, index) in ranks" :key="row.userId" class="flex items-center justify-between gap-3">
        <p class="min-w-0 truncate text-sm font-extrabold text-slate-900">{{ index + 1 }} {{ row.name }}</p>
        <p class="shrink-0 text-sm font-bold text-slate-500">{{ row.count }}건</p>
      </li>
    </ol>
  </section>
</template>
