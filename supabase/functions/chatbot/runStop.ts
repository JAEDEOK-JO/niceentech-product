import type { SupabaseClient } from 'npm:@supabase/supabase-js'

export function watchChatbotRun(supabase: SupabaseClient, runId: string, stop: AbortController) {
  if (!runId) return () => {}
  let closed = false
  const watch = async () => {
    while (!closed && !stop.signal.aborted) {
      const { data, error } = await supabase.from('chatbot_runs').select('stopped').eq('id', runId).maybeSingle()
      if (error) return
      if (data?.stopped) {
        stop.abort()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 700))
    }
  }
  watch().catch((error) => console.error('chatbot stop watch failed', error))
  return () => {
    closed = true
  }
}
