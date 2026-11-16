<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ChatbotComposer from '@/features/chatbot/ChatbotComposer.vue'
import ChatbotSidebar from '@/features/chatbot/ChatbotSidebar.vue'
import ChatbotThread from '@/features/chatbot/ChatbotThread.vue'
import {
  chatbotActiveId,
  chatbotConversations,
  chatbotMessages,
  ensureChatbotConversations,
  openChatbotConversation,
  removeChatbotConversation,
  startChatbotConversation,
} from '@/features/chatbot/chatbotConversationState'
import {
  chatbotReasoning,
  chatbotSending,
  chatbotSendingId,
  chatbotStartedAt,
  sendChatbot,
  stopChatbot,
} from '@/features/chatbot/chatbotSession'

const draft = ref('')
const listEl = ref(null)
const drawerOpen = ref(false)

const showsSending = computed(() => chatbotSending.value && chatbotSendingId.value === chatbotActiveId.value)
const activeTitle = computed(() => {
  const item = chatbotConversations.value.find((conversation) => conversation.id === chatbotActiveId.value)
  return item?.title || '새 채팅'
})

async function scrollToEnd() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

function send() {
  const text = draft.value
  draft.value = ''
  sendChatbot(text).finally(scrollToEnd)
}

function select(id) {
  drawerOpen.value = false
  if (id === chatbotActiveId.value) return
  openChatbotConversation(id).catch(() => {})
}

function create() {
  drawerOpen.value = false
  startChatbotConversation()
}

async function remove(id) {
  if (!window.confirm('삭제할까요?')) return
  if (chatbotSending.value && chatbotSendingId.value === id) stopChatbot()
  try {
    await removeChatbotConversation(id)
  } catch {
    window.alert('삭제 실패')
  }
}

watch([chatbotMessages, chatbotReasoning, showsSending], () => {
  scrollToEnd()
})

onMounted(() => {
  ensureChatbotConversations().catch(() => {})
  scrollToEnd()
})
</script>

<template>
  <main class="flex h-[calc(100dvh-56px)] bg-white md:h-[calc(100dvh-72px)]">
    <div class="hidden h-full md:block">
      <ChatbotSidebar
        :conversations="chatbotConversations"
        :active-id="chatbotActiveId"
        @select="select"
        @create="create"
        @remove="remove"
      />
    </div>
    <div v-if="drawerOpen" class="fixed inset-0 z-40 flex md:hidden">
      <ChatbotSidebar
        class="relative z-10"
        :conversations="chatbotConversations"
        :active-id="chatbotActiveId"
        @select="select"
        @create="create"
        @remove="remove"
      />
      <button class="flex-1 bg-slate-900/30" type="button" aria-label="닫기" @click="drawerOpen = false" />
    </div>
    <section class="flex min-w-0 flex-1 flex-col">
      <div class="flex h-12 shrink-0 items-center gap-1 px-3 md:hidden">
        <button
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          type="button"
          aria-label="대화 목록"
          @click="drawerOpen = true"
        >
          <svg viewBox="0 0 20 20" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="3" y="4" width="14" height="12" rx="2.5" />
            <path d="M8 4v12" />
          </svg>
        </button>
        <p class="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{{ activeTitle }}</p>
      </div>
      <div v-if="chatbotMessages.length" ref="listEl" class="min-h-0 flex-1 overflow-y-auto">
        <ChatbotThread
          :messages="chatbotMessages"
          :sending="showsSending"
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
    </section>
  </main>
</template>
