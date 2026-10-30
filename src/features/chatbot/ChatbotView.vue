<script setup>
import { nextTick, onMounted, ref } from 'vue'
import ChatbotComposer from '@/features/chatbot/ChatbotComposer.vue'
import ChatbotThread from '@/features/chatbot/ChatbotThread.vue'
import { askChatbot } from '@/features/chatbot/askChatbot'
import { fetchChatbotMessages } from '@/features/chatbot/fetchChatbotMessages'

const draft = ref('')
const messages = ref([])
const sending = ref(false)
const liveReasoning = ref('')
const listEl = ref(null)

async function scrollToEnd() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

async function loadMessages() {
  messages.value = await fetchChatbotMessages()
  await scrollToEnd()
}

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  sending.value = true
  liveReasoning.value = ''
  draft.value = ''
  messages.value.push({ id: `local-${Date.now()}`, role: 'user', content: text })
  await scrollToEnd()
  try {
    await askChatbot(text, (delta) => {
      liveReasoning.value += delta
      scrollToEnd()
    })
    messages.value = await fetchChatbotMessages()
  } catch (error) {
    messages.value.push({
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: error?.message || '답변 실패',
    })
  } finally {
    sending.value = false
    liveReasoning.value = ''
    await scrollToEnd()
  }
}

onMounted(() => {
  loadMessages().catch(() => {})
})
</script>

<template>
  <main class="flex h-[calc(100dvh-56px)] flex-col bg-white md:h-[calc(100dvh-72px)]">
    <div v-if="messages.length" ref="listEl" class="min-h-0 flex-1 overflow-y-auto">
      <ChatbotThread :messages="messages" :sending="sending" :live-reasoning="liveReasoning" />
    </div>
    <div :class="messages.length ? 'px-4 pb-5 pt-2' : 'flex flex-1 flex-col items-center justify-center px-4'">
      <h1 v-if="!messages.length" class="mb-8 text-3xl font-semibold tracking-tight text-slate-900">챗봇</h1>
      <ChatbotComposer
        v-model="draft"
        :disabled="sending"
        :class="messages.length ? 'mx-auto w-full max-w-3xl' : 'w-full max-w-2xl'"
        @submit="send"
      />
    </div>
  </main>
</template>
