<script setup>
import { toRef } from 'vue'
import ChatbotConversationItem from '@/features/chatbot/ChatbotConversationItem.vue'
import { useChatbotSearch } from '@/features/chatbot/useChatbotSearch'
import { vVirtualKeyboard } from '@/features/virtual-keyboard/directives/vVirtualKeyboard'

const props = defineProps({
  conversations: { type: Array, default: () => [] },
  activeId: { type: String, default: '' },
})

const emit = defineEmits(['select', 'create', 'remove'])
const { query, visible } = useChatbotSearch(toRef(props, 'conversations'))
</script>

<template>
  <aside class="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
    <div class="space-y-2 p-3">
      <button
        class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200/70"
        type="button"
        @click="emit('create')"
      >
        <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M10 4v12M4 10h12" stroke-linecap="round" />
        </svg>
        새 채팅
      </button>
      <input
        v-model="query"
        v-virtual-keyboard
        type="search"
        placeholder="검색"
        class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
      />
    </div>
    <ul class="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
      <li v-for="item in visible" :key="item.id">
        <ChatbotConversationItem
          :item="item"
          :active="item.id === activeId"
          @select="emit('select', item.id)"
          @remove="emit('remove', item.id)"
        />
      </li>
    </ul>
  </aside>
</template>
