<script setup lang="ts">
const section = defineModel<'reward' | 'attendance'>({ required: true })

const tabs = [
  { id: 'attendance', label: '근태관리' },
  { id: 'reward', label: '포상관리' },
] as const
</script>

<template>
  <div class="flex w-fit flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="rounded-lg px-4 py-2 text-sm font-extrabold transition-colors"
      :class="section === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'"
      @click="section = tab.id"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
