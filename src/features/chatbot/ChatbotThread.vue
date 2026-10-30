<script setup>
import ChatbotThinking from '@/features/chatbot/ChatbotThinking.vue'

defineProps({
  messages: { type: Array, default: () => [] },
  sending: { type: Boolean, default: false },
  liveReasoning: { type: String, default: '' },
})

function showsThinking(message) {
  return Boolean(message.reasoning) || Number(message.duration_ms) > 1000
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-8">
    <div v-for="message in messages" :key="message.id" class="flex">
      <p
        v-if="message.role === 'user'"
        class="ml-auto max-w-[80%] whitespace-pre-wrap rounded-3xl bg-slate-100 px-4 py-2.5 text-[15px] leading-7 text-slate-900"
      >
        {{ message.content }}
      </p>
      <div v-else class="min-w-0 max-w-full flex-1">
        <ChatbotThinking
          v-if="showsThinking(message)"
          :duration-ms="message.duration_ms"
          :reasoning="message.reasoning || ''"
        />
        <p class="whitespace-pre-wrap text-[15px] leading-7 text-slate-800">{{ message.content }}</p>
      </div>
    </div>
    <ChatbotThinking v-if="sending" live :reasoning="liveReasoning" />
  </div>
</template>
