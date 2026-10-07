import { supabase } from '@/lib/supabase'

const POLL_MS = 5_000
const WAIT_MS = 30 * 60 * 1000
const FINAL_STATES = ['done', 'review', 'failed']

export function watchDrawingQuantityState(drawingFileId) {
  const started = Date.now()

  return new Promise((resolve) => {
    let settled = false
    let timer = null

    const finish = (state) => {
      if (settled) return
      settled = true
      if (timer) window.clearInterval(timer)
      resolve(state)
    }

    const poll = async () => {
      if (settled) return
      const { data } = await supabase
        .from('drawing_pdf')
        .select('quantity_state')
        .eq('id', drawingFileId)
        .maybeSingle()

      const state = data?.quantity_state
      if (FINAL_STATES.includes(state)) {
        finish(state)
        return
      }

      if (Date.now() - started >= WAIT_MS) {
        finish(state === 'running' ? 'running' : 'failed')
      }
    }

    timer = window.setInterval(() => {
      void poll()
    }, POLL_MS)
    void poll()
  })
}
