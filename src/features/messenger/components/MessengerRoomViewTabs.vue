<script setup lang="ts">
const props = defineProps<{
  modelValue: 'chat' | 'open' | 'done'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: 'chat' | 'open' | 'done']
}>()

const tabs = [
  { id: 'chat' as const, label: '채팅' },
  { id: 'open' as const, label: '작업요청' },
  { id: 'done' as const, label: '작업완료' },
]
</script>

<template>
  <div class="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition sm:px-3 sm:text-xs"
      :class="
        modelValue === tab.id
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      "
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
