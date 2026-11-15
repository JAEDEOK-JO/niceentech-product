<script setup>
defineProps({
  ranks: {
    type: Array,
    default: () => [],
  },
})

const badgeClass = (index) => {
  if (index === 0) return 'bg-amber-500 text-white'
  if (index === 1) return 'bg-slate-400 text-white'
  if (index === 2) return 'bg-orange-300 text-white'
  return 'bg-slate-100 text-slate-500'
}
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4">
    <h3 class="text-sm font-extrabold text-slate-900">이달의 포상</h3>
    <p v-if="ranks.length === 0" class="py-6 text-center text-sm text-slate-400">없음</p>
    <ol v-else class="mt-3 space-y-2">
      <li v-for="(row, index) in ranks" :key="row.userId" class="flex items-center gap-3">
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold"
          :class="badgeClass(index)"
        >
          {{ index + 1 }}
        </span>
        <p class="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-900">
          {{ row.name }}<span v-if="row.department" class="ml-1.5 text-xs font-bold text-slate-400">{{ row.department }}</span>
        </p>
        <p class="shrink-0 text-sm font-extrabold text-slate-700">{{ row.count }}건</p>
      </li>
    </ol>
  </section>
</template>
