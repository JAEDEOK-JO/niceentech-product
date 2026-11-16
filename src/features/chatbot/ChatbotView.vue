<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import ChatbotComposer from '@/features/chatbot/ChatbotComposer.vue'
import ChatbotThread from '@/features/chatbot/ChatbotThread.vue'
import {
  chatbotMessages,
  chatbotReasoning,
  chatbotSending,
  chatbotStartedAt,
  ensureChatbotMessages,
  sendChatbot,
  stopChatbot,
} from '@/features/chatbot/chatbotSession'

const draft = ref('')
const listEl = ref(null)

async function scrollToEnd() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

function send() {
  const text = draft.value
  draft.value = ''
  sendChatbot(text).finally(scrollToEnd)
}

watch([chatbotMessages, chatbotReasoning, chatbotSending], () => {
  scrollToEnd()
})

onMounted(() => {
  ensureChatbotMessages().finally(scrollToEnd)
})
</script>

<template>
  <main class="flex h-[calc(100dvh-56px)] flex-col bg-white md:h-[calc(100dvh-72px)]">
    <div v-if="chatbotMessages.length" ref="listEl" class="min-h-0 flex-1 overflow-y-auto">
      <ChatbotThread
        :messages="chatbotMessages"
        :sending="chatbotSending"
        :live-reasoning="chatbotReasoning"
        :started-at="chatbotStartedAt"
      />
    </div>
    <div :class="chatbotMessages.length ? 'px-4 pb-5 pt-2' : 'flex flex-1 flex-col items-center justify-center px-4'">
      <h1 v-if="!chatbotMessages.length" class="mb-8 text-3xl font-semibold tracking-tight text-slate-900">챗봇</h1>
      <ChatbotComposer
        v-model="draft"
        :busy="chatbotSending"
        :class="chatbotMessages.length ? 'mx-auto w-full max-w-3xl' : 'w-full max-w-2xl'"
        @submit="send"
        @stop="stopChatbot"
      />
    </div>
  </main>
</template>
