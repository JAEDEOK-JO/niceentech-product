import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { askChatbot } from '@/features/chatbot/askChatbot'
import {
  addLocalConversation,
  addPendingMessage,
  chatbotActiveId,
  clearPendingMessages,
  loadChatbotConversations,
  reloadChatbotMessages,
} from '@/features/chatbot/chatbotConversationState'

export const chatbotSending = ref(false)
export const chatbotSendingId = ref('')
export const chatbotReasoning = ref('')
export const chatbotStartedAt = ref(0)

let run = 0
let controller = null
let activeRunId = ''

async function markRun(id) {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user?.id
  if (!userId) return
  await supabase.from('chatbot_runs').insert({ id, user_id: userId })
}

function markStopped(id) {
  if (!id) return
  supabase.from('chatbot_runs').update({ stopped: true }).eq('id', id).then(() => {})
}

function resetSending() {
  chatbotSending.value = false
  chatbotSendingId.value = ''
  chatbotReasoning.value = ''
  chatbotStartedAt.value = 0
  controller = null
  activeRunId = ''
}

export function stopChatbot() {
  if (!chatbotSending.value) return
  const id = activeRunId
  run += 1
  controller?.abort()
  resetSending()
  markStopped(id)
}

export async function sendChatbot(question) {
  const text = String(question ?? '').trim()
  if (!text || chatbotSending.value) return
  const current = ++run
  const abort = new AbortController()
  const id = crypto.randomUUID()
  let conversationId = chatbotActiveId.value
  if (!conversationId) {
    conversationId = crypto.randomUUID()
    addLocalConversation(conversationId, text)
    chatbotActiveId.value = conversationId
  }

  controller = abort
  activeRunId = id
  chatbotSending.value = true
  chatbotSendingId.value = conversationId
  chatbotReasoning.value = ''
  chatbotStartedAt.value = Date.now()
  addPendingMessage(conversationId, { id: `local-${Date.now()}`, role: 'user', content: text })

  try {
    await markRun(id)
    if (current !== run) return
    await askChatbot(
      text,
      (delta) => {
        if (current !== run) return
        chatbotReasoning.value += delta
      },
      abort.signal,
      id,
      conversationId,
    )
    if (current !== run) return
    clearPendingMessages(conversationId)
    await Promise.all([loadChatbotConversations(), reloadChatbotMessages(conversationId)])
  } catch (error) {
    if (current !== run || abort.signal.aborted || error?.name === 'AbortError') return
    addPendingMessage(conversationId, {
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: error?.message || '답변 실패',
    })
  } finally {
    if (current === run) resetSending()
  }
}
