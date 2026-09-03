<script setup lang="ts">
defineProps<{
  count?: number
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition active:scale-95"
    @click="$emit('click')"
  >
    <span
      v-if="(count ?? 0) > 0"
      class="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-extrabold text-white"
    >{{ (count ?? 0) > 99 ? '99+' : count }}</span>
    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.4">
      <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>
</template>
