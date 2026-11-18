<script setup>
defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['edit', 'remove'])
</script>

<template>
  <div class="mt-3 grid grid-cols-2 gap-2">
    <button
      type="button"
      class="rounded-xl border border-slate-200 py-2 text-sm font-extrabold text-slate-700 disabled:opacity-40"
      :disabled="disabled"
      @click="emit('edit')"
    >
      수정
    </button>
    <button
      type="button"
      class="rounded-xl border border-rose-200 py-2 text-sm font-extrabold text-rose-600 disabled:opacity-40"
      :disabled="disabled"
      @click="emit('remove')"
    >
      삭제
    </button>
  </div>
</template>
