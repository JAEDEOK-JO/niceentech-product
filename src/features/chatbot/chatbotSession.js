import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { askChatbot } from '@/features/chatbot/askChatbot'
import { fetchChatbotMessages } from '@/features/chatbot/fetchChatbotMessages'

export const chatbotMessages = ref([])
export const chatbotSending = ref(false)
export const chatbotReasoning = ref('')
export const chatbotStartedAt = ref(0)

let loaded = false
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

function pendingMessages() {
  return chatbotMessages.value.filter((message) => {
    const id = String(message.id ?? '')
    return id.startsWith('local-') || id.startsWith('error-')
  })
}

export async function ensureChatbotMessages() {
  if (loaded) return
  const rows = await fetchChatbotMessages()
  if (loaded) return
  chatbotMessages.value = [...rows, ...pendingMessages()]
  loaded = true
}

export function stopChatbot() {
  if (!chatbotSending.value) return
  const id = activeRunId
  activeRunId = ''
  run += 1
  controller?.abort()
  controller = null
  chatbotSending.value = false
  chatbotReasoning.value = ''
  chatbotStartedAt.value = 0
  markStopped(id)
}

export async function sendChatbot(question) {
  const text = String(question ?? '').trim()
  if (!text || chatbotSending.value) return
  const current = ++run
  const abort = new AbortController()
  const id = crypto.randomUUID()
  controller = abort
  activeRunId = id
  chatbotSending.value = true
  chatbotReasoning.value = ''
  chatbotStartedAt.value = Date.now()
  chatbotMessages.value.push({ id: `local-${Date.now()}`, role: 'user', content: text })

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
    )
    if (current !== run) return
    chatbotMessages.value = await fetchChatbotMessages()
    loaded = true
  } catch (error) {
    if (current !== run || abort.signal.aborted || error?.name === 'AbortError') return
    chatbotMessages.value.push({
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: error?.message || '답변 실패',
    })
  } finally {
    if (current !== run) return
    chatbotSending.value = false
    chatbotReasoning.value = ''
    chatbotStartedAt.value = 0
    controller = null
    activeRunId = ''
  }
}
