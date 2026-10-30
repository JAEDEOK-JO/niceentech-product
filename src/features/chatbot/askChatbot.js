import { supabase } from '@/lib/supabase'
import { readChatbotStream } from '@/features/chatbot/readChatbotStream'

async function readFailureMessage(error, data) {
  if (data?.message) return String(data.message)
  try {
    const body = await error?.context?.json?.()
    if (body?.message) return String(body.message)
  } catch {
    // 본문이 없으면 아래 문구를 쓴다.
  }
  return '답변 실패'
}

export async function askChatbot(question, onReasoning) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('로그인이 필요합니다')

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ question }),
  })

  const type = response.headers.get('content-type') ?? ''
  if (type.includes('text/event-stream')) {
    if (!response.ok) throw new Error('답변 실패')
    await readChatbotStream(response, onReasoning)
    return
  }

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) throw new Error(await readFailureMessage(null, data))
}
