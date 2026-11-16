<script setup>
import { formatChatbotTime } from '@/features/chatbot/formatChatbotTime'

defineProps({
  item: { type: Object, required: true },
  active: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'remove'])
</script>

<template>
  <div class="flex items-center rounded-xl" :class="active ? 'bg-slate-200/80' : 'hover:bg-slate-200/50'">
    <button class="min-w-0 flex-1 px-3 py-2 text-left" type="button" @click="emit('select')">
      <p class="truncate text-sm text-slate-900">{{ item.title || '새 채팅' }}</p>
      <p class="mt-0.5 text-xs text-slate-500">{{ formatChatbotTime(item.updated_at) }}</p>
    </button>
    <button
      class="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-300/60 hover:text-slate-700"
      type="button"
      aria-label="삭제"
      @click="emit('remove')"
    >
      <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7">
        <path
          d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6M8.5 9v4M11.5 9v4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>
