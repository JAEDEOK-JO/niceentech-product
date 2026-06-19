<script setup>
import { formatBadgeQty } from '@/features/welding-schedule/utils/weldingScheduleLegend'

defineProps({
  totals: {
    type: Object,
    default: () => ({ head: 0, hole: 0, inch: 0 }),
  },
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span
      v-if="Number(totals.head || 0) > 0"
      class="inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800"
    >
      헤드 {{ formatBadgeQty(totals.head) }}
    </span>
    <span
      v-if="Number(totals.hole || 0) > 0"
      class="inline-flex items-center rounded bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800"
    >
      홀 {{ formatBadgeQty(totals.hole) }}
    </span>
    <span
      v-if="Number(totals.inch || 0) > 0"
      class="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"
    >
      인치 {{ formatBadgeQty(totals.inch) }}
    </span>
  </div>
</template>
