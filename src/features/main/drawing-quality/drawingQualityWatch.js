import { supabase } from '@/lib/supabase'

const POLL_MS = 5_000
const WAIT_MS = 30 * 60 * 1000
const FINAL_STATES = ['done', 'review', 'failed']

export function watchDrawingQuantityState(drawingFileId) {
  const started = Date.now()

  return new Promise((resolve) => {
    const timer = window.setInterval(async () => {
      const { data } = await supabase
        .from('drawing_pdf')
        .select('quantity_state')
        .eq('id', drawingFileId)
        .maybeSingle()

      const state = data?.quantity_state
      if (FINAL_STATES.includes(state)) {
        window.clearInterval(timer)
        resolve(state)
        return
      }

      if (Date.now() - started >= WAIT_MS) {
        window.clearInterval(timer)
        resolve(state === 'running' ? 'running' : 'failed')
      }
    }, POLL_MS)
  })
}
