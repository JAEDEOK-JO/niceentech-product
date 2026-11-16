<script setup>
import ChatbotAnswer from '@/features/chatbot/ChatbotAnswer.vue'
import ChatbotThinking from '@/features/chatbot/ChatbotThinking.vue'
import { formatChatbotTime } from '@/features/chatbot/formatChatbotTime'

defineProps({
  messages: { type: Array, default: () => [] },
  sending: { type: Boolean, default: false },
  liveReasoning: { type: String, default: '' },
  startedAt: { type: Number, default: 0 },
})

function showsThinking(message) {
  return Boolean(message.reasoning) || Number(message.duration_ms) > 1000
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-8">
    <div v-for="message in messages" :key="message.id" class="flex">
      <div v-if="message.role === 'user'" class="ml-auto flex max-w-[80%] flex-col items-end">
        <p class="whitespace-pre-wrap rounded-3xl bg-slate-100 px-4 py-2.5 text-[15px] leading-7 text-slate-900">
          {{ message.content }}
        </p>
        <time class="mt-1 px-2 text-xs text-slate-400">{{ formatChatbotTime(message.created_at) }}</time>
      </div>
      <div v-else class="min-w-0 max-w-full flex-1">
        <ChatbotThinking
          v-if="showsThinking(message)"
          :duration-ms="message.duration_ms"
          :reasoning="message.reasoning || ''"
        />
        <ChatbotAnswer :content="message.content" />
        <time class="mt-1 block text-xs text-slate-400">{{ formatChatbotTime(message.created_at) }}</time>
      </div>
    </div>
    <ChatbotThinking v-if="sending" live :started-at="startedAt" :reasoning="liveReasoning" />
  </div>
</template>
