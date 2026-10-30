import { supabase } from '@/lib/supabase'

export async function fetchChatbotNotes() {
  const { data, error } = await supabase
    .from('chatbot_notes')
    .select('id, kind, topic, note, keywords, source_question, hit_count, last_used_at, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data ?? []
}

export async function deleteChatbotNote(id) {
  const { error } = await supabase.from('chatbot_notes').delete().eq('id', id)
  if (error) throw error
}
