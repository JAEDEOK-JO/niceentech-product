import type { SupabaseClient } from 'npm:@supabase/supabase-js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function readConversationId(value: unknown) {
  const text = String(value ?? '')
  return UUID.test(text) ? text.toLowerCase() : ''
}

export async function resolveConversation(supabase: SupabaseClient, userId: string, requested: string) {
  if (requested) {
    const { data, error } = await supabase
      .from('chatbot_conversations')
      .select('user_id')
      .eq('id', requested)
      .maybeSingle()
    if (error) throw error
    if (data && data.user_id !== userId) throw new Error('conversation_forbidden')
    return requested
  }

  const { data, error } = await supabase
    .from('chatbot_conversations')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return String(data?.id ?? crypto.randomUUID())
}

export async function saveConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  question: string,
) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('chatbot_conversations')
    .update({ updated_at: now })
    .eq('id', conversationId)
    .eq('user_id', userId)
    .select('id')
  if (error) throw error
  if (data?.length) return

  const { error: insertError } = await supabase.from('chatbot_conversations').insert({
    id: conversationId,
    user_id: userId,
    title: question.trim().slice(0, 120),
    created_at: now,
    updated_at: now,
  })
  if (insertError) throw insertError
}
