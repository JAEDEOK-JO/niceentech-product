<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  groups: { type: Array, default: () => [] },
  targetValue: { type: Number, default: 0 },
  targetLabel: { type: String, default: '' },
})

const CHART_HEIGHT = 150

const maxValue = computed(() => {
  const values = props.groups.flatMap((group) => group.bars.map((bar) => Number(bar.value) || 0))
  return Math.max(...values, props.targetValue || 0, 1)
})

const barHeight = (value) => {
  const numeric = Number(value) || 0
  if (numeric <= 0) return 0
  return Math.max(4, Math.round((numeric / maxValue.value) * CHART_HEIGHT))
}

const targetBottom = computed(() => {
  if (!props.targetValue) return 0
  return Math.round((props.targetValue / maxValue.value) * CHART_HEIGHT)
})

const legendItems = computed(() => {
  const first = props.groups[0]
  if (!first || first.bars.length < 2) return []
  return first.bars.map((bar) => ({ label: bar.label, color: bar.color }))
})
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-4">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-extrabold text-slate-900">{{ title }}</p>
      <div v-if="legendItems.length" class="flex items-center gap-3">
        <span v-for="item in legendItems" :key="item.label" class="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <span class="h-2.5 w-2.5 rounded-sm" :style="{ backgroundColor: item.color }" />
          {{ item.label }}
        </span>
      </div>
    </div>

    <div class="relative mt-4" :style="{ height: `${CHART_HEIGHT + 34}px` }">
      <div
        v-if="targetValue"
        class="absolute inset-x-0 z-10 border-t-2 border-dashed border-rose-400"
        :style="{ bottom: `${targetBottom + 34}px` }"
      >
        <span class="absolute -top-5 right-0 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-600">
          {{ targetLabel }}
        </span>
      </div>

      <div class="flex h-full items-end justify-around gap-2">
        <div v-for="group in groups" :key="group.label" class="flex min-w-0 flex-1 flex-col items-center">
          <div class="flex w-full items-end justify-center gap-1.5" :style="{ height: `${CHART_HEIGHT}px` }">
            <div v-for="bar in group.bars" :key="bar.label" class="flex w-full max-w-[52px] flex-col items-center justify-end">
              <span class="mb-1 whitespace-nowrap text-[10px] font-extrabold text-slate-600">{{ bar.display }}</span>
              <div
                class="w-full rounded-t-md transition-all"
                :style="{ height: `${barHeight(bar.value)}px`, backgroundColor: bar.color }"
              />
            </div>
          </div>
          <p class="mt-2 h-6 text-xs font-bold text-slate-700">{{ group.label }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
