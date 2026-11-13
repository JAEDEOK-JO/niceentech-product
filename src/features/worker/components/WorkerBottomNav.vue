<script setup lang="ts">
import type { WorkerTab } from '../workerTab'

const tab = defineModel<WorkerTab>({ required: true })

const items: { id: WorkerTab; label: string }[] = [
  { id: 'notice', label: '알림' },
  { id: 'attendance', label: '근태' },
  { id: 'reward', label: '포상' },
  { id: 'profile', label: '내정보' },
]
</script>

<template>
  <nav class="grid shrink-0 grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="py-3 text-sm font-extrabold"
      :class="tab === item.id ? 'text-slate-900' : 'text-slate-400'"
      @click="tab = item.id"
    >
      {{ item.label }}
    </button>
  </nav>
</template>
