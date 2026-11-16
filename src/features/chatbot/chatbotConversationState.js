import { ref } from 'vue'
import { deleteChatbotConversation, fetchChatbotConversations } from '@/features/chatbot/chatbotConversations'
import { fetchChatbotMessages } from '@/features/chatbot/fetchChatbotMessages'

export const chatbotConversations = ref([])
export const chatbotActiveId = ref('')
export const chatbotMessages = ref([])

const cache = new Map()
const pending = new Map()
const loadTokens = new Map()
let listLoaded = false

function pendingFor(id) {
  return pending.get(id) ?? []
}

function showMessages(id) {
  if (chatbotActiveId.value !== id) return
  chatbotMessages.value = [...(cache.get(id) ?? []), ...pendingFor(id)]
}

export async function loadChatbotConversations() {
  const rows = await fetchChatbotConversations()
  const ids = new Set(rows.map((row) => row.id))
  const locals = chatbotConversations.value.filter((item) => item.local && !ids.has(item.id))
  chatbotConversations.value = [...locals, ...rows]
}

export async function ensureChatbotConversations() {
  if (listLoaded) return
  listLoaded = true
  try {
    await loadChatbotConversations()
  } catch (error) {
    listLoaded = false
    throw error
  }
}

export async function reloadChatbotMessages(id) {
  const token = (loadTokens.get(id) ?? 0) + 1
  loadTokens.set(id, token)
  const rows = await fetchChatbotMessages(id)
  if (loadTokens.get(id) !== token) return
  cache.set(id, rows)
  showMessages(id)
}

export function openChatbotConversation(id) {
  chatbotActiveId.value = id
  showMessages(id)
  return reloadChatbotMessages(id)
}

export function startChatbotConversation() {
  chatbotActiveId.value = ''
  chatbotMessages.value = []
}

export function addLocalConversation(id, title) {
  const now = new Date().toISOString()
  chatbotConversations.value = [
    { id, title: title.slice(0, 120), created_at: now, updated_at: now, local: true },
    ...chatbotConversations.value,
  ]
}

export function addPendingMessage(id, message) {
  pending.set(id, [...pendingFor(id), { created_at: new Date().toISOString(), ...message }])
  showMessages(id)
}

export function clearPendingMessages(id) {
  pending.delete(id)
}

export async function removeChatbotConversation(id) {
  await deleteChatbotConversation(id)
  cache.delete(id)
  pending.delete(id)
  loadTokens.delete(id)
  chatbotConversations.value = chatbotConversations.value.filter((item) => item.id !== id)
  if (chatbotActiveId.value === id) startChatbotConversation()
}
