<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const visibleRows = computed(() => props.rows ?? [])

const formatNumber = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

const quantityClass = (quantity) => {
  const number = Number(quantity || 0)
  if (number < 0) return 'text-red-600'
  if (number > 0) return 'text-slate-950'
  return 'text-slate-400'
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div
      class="flex flex-col border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between"
      :class="compact ? 'gap-2 px-3 py-2' : 'gap-1 px-4 py-3'"
    >
      <div>
        <h2 class="text-sm font-extrabold text-slate-900">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-xs font-bold text-slate-500">{{ description }}</p>
      </div>
      <span class="text-xs font-bold text-slate-500">{{ visibleRows.length }}개 자재</span>
    </div>
    <div v-if="loading" class="px-4 py-8 text-center text-sm font-bold text-slate-500">
      재고를 불러오는 중입니다.
    </div>
    <div
      v-else
      class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
      :class="compact ? 'gap-1.5 p-2' : 'gap-2 p-3'"
    >
      <div
        v-for="row in visibleRows"
        :key="row.id"
        class="rounded-lg border border-slate-200 bg-slate-50"
        :class="compact ? 'px-2 py-1.5' : 'px-3 py-2'"
      >
        <p class="truncate text-xs font-extrabold text-slate-500">{{ row.label }}</p>
        <p class="mt-1 font-black" :class="[compact ? 'text-base' : 'text-lg', quantityClass(row.quantity)]">
          {{ formatNumber(row.quantity) }}{{ row.unit }}
        </p>
      </div>
    </div>
  </section>
</template>
