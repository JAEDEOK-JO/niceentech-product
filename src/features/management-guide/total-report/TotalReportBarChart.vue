<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  groups: { type: Array, default: () => [] },
  targetValue: { type: Number, default: 0 },
  targetLabel: { type: String, default: '' },
  // true면 Y축 상한을 목표선 기준으로 잡아 막대·목표선 비율을 명확히 한다.
  anchorScaleToTarget: { type: Boolean, default: false },
})

const PLOT_HEIGHT = 140

const maxValue = computed(() => {
  const values = props.groups.flatMap((group) => group.bars.map((bar) => Number(bar.value) || 0))
  const dataPeak = Math.max(...values, 1)

  if (props.anchorScaleToTarget && props.targetValue > 0) {
    return Math.max(props.targetValue * 1.15, dataPeak * 1.05)
  }

  const peak = Math.max(dataPeak, props.targetValue || 0)
  return peak * 1.1
})

const barHeight = (value) => {
  const numeric = Number(value) || 0
  if (numeric <= 0) return 0
  return Math.max(3, Math.round((numeric / maxValue.value) * PLOT_HEIGHT))
}

const targetBottom = computed(() => {
  if (!props.targetValue) return 0
  return Math.round((props.targetValue / maxValue.value) * PLOT_HEIGHT)
})

const legendItems = computed(() => {
  const first = props.groups[0]
  if (!first || first.bars.length < 2) return []
  return first.bars.map((bar) => ({ label: bar.label, color: bar.color }))
})

const gridLines = computed(() =>
  [1, 2, 3].map((index) => ({
    key: index,
    bottom: Math.round((index / 4) * PLOT_HEIGHT),
  })),
)

// 칸 폭이 좁아 단위 없는 큰 숫자(예: 20,751)는 만 단위로 축약한다. 원본 값은 툴팁으로 확인.
const compactValue = (bar) => {
  const raw = String(bar.display ?? '')
  const numeric = Number(bar.value) || 0
  if (numeric >= 10000 && /^[\d,]+$/.test(raw)) {
    return `${(numeric / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`
  }
  return raw
}
</script>

<template>
  <div class="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
    <div class="flex min-w-0 flex-wrap items-start justify-between gap-x-2 gap-y-1">
      <p class="min-w-0 text-[13px] font-extrabold leading-snug text-slate-900 sm:text-sm">{{ title }}</p>
      <div v-if="legendItems.length" class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span
          v-for="item in legendItems"
          :key="item.label"
          class="flex items-center gap-1 text-[10px] font-bold text-slate-500"
        >
          <span class="h-2 w-2 shrink-0 rounded-sm" :style="{ backgroundColor: item.color }" />
          <span class="truncate">{{ item.label }}</span>
        </span>
      </div>
    </div>

    <div class="relative mt-6" :style="{ height: `${PLOT_HEIGHT}px` }">
      <div
        v-for="line in gridLines"
        :key="line.key"
        class="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-100"
        :style="{ bottom: `${line.bottom}px` }"
      />

      <div
        v-if="targetValue"
        class="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-rose-400"
        :style="{ bottom: `${targetBottom}px` }"
      >
        <span class="absolute -top-4 right-0 rounded bg-rose-50 px-1 py-0.5 text-[9px] font-extrabold text-rose-600">
          {{ targetLabel }}
        </span>
      </div>

      <div class="flex h-full items-end gap-1.5 sm:gap-2">
        <div
          v-for="group in groups"
          :key="group.label"
          class="flex h-full min-w-0 flex-1 items-end justify-center gap-1 rounded-t-xl bg-slate-50/70 px-1 sm:gap-1.5 sm:px-1.5"
        >
          <div
            v-for="bar in group.bars"
            :key="bar.label"
            class="flex min-w-0 max-w-[34px] flex-1 flex-col items-center justify-end"
          >
            <div
              class="w-full min-w-[8px] rounded-t-md shadow-sm"
              :style="{ height: `${barHeight(bar.value)}px`, backgroundColor: bar.color }"
              :title="bar.tooltip ?? `${bar.label}: ${bar.display}`"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-1.5 sm:gap-2">
      <div
        v-for="group in groups"
        :key="`${group.label}-footer`"
        class="flex min-w-0 flex-1 flex-col items-center rounded-b-xl bg-slate-50/70 px-1 pb-1.5 pt-1 sm:px-1.5"
      >
        <div class="flex w-full justify-center gap-1 sm:gap-1.5">
          <p
            v-for="bar in group.bars"
            :key="`${group.label}-${bar.label}-value`"
            class="min-w-0 max-w-[34px] flex-1 whitespace-nowrap text-center text-[8px] font-extrabold tabular-nums leading-none text-slate-600 sm:text-[9px]"
            :title="bar.tooltip ?? bar.display"
          >
            {{ compactValue(bar) }}
          </p>
        </div>
        <p class="mt-1 text-[10px] font-bold text-slate-700 sm:text-[11px]">{{ group.label }}</p>
      </div>
    </div>
  </div>
</template>
