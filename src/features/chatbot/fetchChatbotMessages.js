import { supabase } from '@/lib/supabase'

export async function fetchChatbotMessages() {
  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('id, role, content, reasoning, duration_ms, created_at')
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw error
  return data ?? []
}
