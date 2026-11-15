<script setup>
defineProps({
  label: {
    type: String,
    default: '',
  },
  canNext: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['prev', 'next'])
</script>

<template>
  <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-1.5 py-1.5">
    <button
      type="button"
      class="rounded-lg p-2 text-slate-500 active:bg-slate-100"
      aria-label="지난달"
      @click="emit('prev')"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </button>
    <p class="text-sm font-extrabold text-slate-900">{{ label }}</p>
    <button
      type="button"
      class="rounded-lg p-2 text-slate-500 active:bg-slate-100 disabled:opacity-30"
      aria-label="다음달"
      :disabled="!canNext"
      @click="emit('next')"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6" />
      </svg>
    </button>
  </div>
</template>
