import { supabase } from '@/lib/supabase'

export async function fetchChatbotConversations() {
  const { data, error } = await supabase
    .from('chatbot_conversations')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) throw error
  return data ?? []
}

export async function deleteChatbotConversation(id) {
  const { error } = await supabase.from('chatbot_conversations').delete().eq('id', id)
  if (error) throw error
}

function likePattern(text) {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

export async function searchChatbotConversations(text) {
  const pattern = likePattern(text)
  const [titles, messages] = await Promise.all([
    supabase.from('chatbot_conversations').select('id').ilike('title', pattern).limit(200),
    supabase.from('chatbot_messages').select('conversation_id').ilike('content', pattern).limit(500),
  ])
  if (titles.error) throw titles.error
  if (messages.error) throw messages.error
  return [
    ...(titles.data ?? []).map((row) => row.id),
    ...(messages.data ?? []).map((row) => row.conversation_id),
  ].filter(Boolean)
}
