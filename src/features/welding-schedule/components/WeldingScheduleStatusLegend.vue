<script setup>
import { weldingStatusLegendItems } from '@/features/welding-schedule/utils/weldingScheduleLegend'
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span
      v-for="item in weldingStatusLegendItems"
      :key="item.label"
      class="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold"
      :class="item.className"
    >
      {{ item.label }}
    </span>
  </div>
</template>
