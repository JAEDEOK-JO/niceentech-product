import { supabase } from '@/lib/supabase'

export async function fetchChatbotMessages(conversationId) {
  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('id, role, content, reasoning, duration_ms, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(200)

  if (error) throw error
  return (data ?? []).reverse()
}
