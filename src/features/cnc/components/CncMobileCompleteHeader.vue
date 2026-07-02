<script setup lang="ts">
import type { CncItem } from '../types/cnc'
import { formatCncShortDate } from '../utils/cncDate'

defineProps<{
  item: CncItem
  busy: boolean
  statusLabel: string
  statusClass: string
}>()
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold">
      <span v-if="formatCncShortDate(item.createdAt)" class="text-slate-500">
        등록일
        <span class="ml-1 text-slate-700">{{ formatCncShortDate(item.createdAt) }}</span>
      </span>
      <span v-if="formatCncShortDate(item.completedAt)" class="text-slate-500">
        완료일
        <span class="ml-1 text-red-600">{{ formatCncShortDate(item.completedAt) }}</span>
      </span>
    </div>
    <span
      class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold"
      :class="statusClass"
    >
      {{ statusLabel }}
    </span>
  </div>
</template>
