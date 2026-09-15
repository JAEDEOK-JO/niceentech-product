<script setup lang="ts">
import { WORK_END_TIME_OPTIONS } from '../types/attendance'
import { ALL_STATION_WORK_END_PRESETS } from '../utils/dailyWorkHourPresets'

const emit = defineEmits<{
  (e: 'applyProduction', time: string): void
  (e: 'applyAllStations', time: string): void
}>()
</script>

<template>
  <p class="mb-3 text-sm font-bold text-slate-700">생산 일괄 적용</p>
  <div class="mb-3 grid grid-cols-3 gap-2">
    <button
      v-for="opt in WORK_END_TIME_OPTIONS"
      :key="opt.value"
      type="button"
      class="rounded-xl bg-emerald-600 px-3 py-3 text-sm font-extrabold text-white hover:bg-emerald-500"
      @click="emit('applyProduction', opt.value)"
    >생산 {{ opt.label }}</button>
  </div>
  <div class="mb-5 grid grid-cols-2 gap-2">
    <button
      v-for="opt in ALL_STATION_WORK_END_PRESETS"
      :key="opt.value"
      type="button"
      class="rounded-xl bg-emerald-600 px-3 py-3 text-sm font-extrabold text-white hover:bg-emerald-500"
      @click="emit('applyAllStations', opt.value)"
    >{{ opt.label }}</button>
  </div>
</template>
