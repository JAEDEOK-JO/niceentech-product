import { computed, onUnmounted, ref, watch } from 'vue'
import { searchChatbotConversations } from '@/features/chatbot/chatbotConversations'

export function useChatbotSearch(conversations) {
  const query = ref('')
  const matchedIds = ref(null)
  let timer = 0
  let token = 0

  watch(query, (value) => {
    window.clearTimeout(timer)
    const text = value.trim()
    token += 1
    if (!text) {
      matchedIds.value = null
      return
    }
    const current = token
    timer = window.setTimeout(async () => {
      const ids = await searchChatbotConversations(text).catch(() => [])
      if (current !== token) return
      matchedIds.value = new Set(ids)
    }, 250)
  })

  const visible = computed(() => {
    const ids = matchedIds.value
    if (!ids) return conversations.value
    const text = query.value.trim().toLowerCase()
    return conversations.value.filter(
      (item) => ids.has(item.id) || (item.local && String(item.title ?? '').toLowerCase().includes(text)),
    )
  })

  onUnmounted(() => window.clearTimeout(timer))

  return { query, visible }
}
