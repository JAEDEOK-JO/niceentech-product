<script setup>
const view = defineModel({ type: String, required: true })

const tabs = [
  { id: 'all', label: '전체' },
  { id: 'mine', label: '내 신청' },
]
</script>

<template>
  <div class="grid grid-cols-2 rounded-xl bg-slate-200/70 p-1">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="rounded-lg py-2 text-sm font-extrabold"
      :class="view === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
      @click="view = tab.id"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
