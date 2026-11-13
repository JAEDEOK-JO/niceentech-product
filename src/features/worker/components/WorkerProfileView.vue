<script setup lang="ts">
defineProps<{
  name: string
}>()

const emit = defineEmits<{
  (e: 'logout'): void
}>()
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-8 px-6">
    <p class="text-xl font-extrabold text-slate-900">{{ name || '-' }}</p>
    <button
      type="button"
      class="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700"
      @click="emit('logout')"
    >
      로그아웃
    </button>
  </div>
</template>
