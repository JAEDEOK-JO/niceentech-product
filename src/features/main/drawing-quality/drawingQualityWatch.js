import { supabase } from '@/lib/supabase'

const POLL_MS = 2_000
const WAIT_MS = 30 * 60 * 1000
const FINAL_STATES = ['done', 'review', 'failed']

export function watchDrawingQuantityState(drawingFileId) {
  const started = Date.now()

  return new Promise((resolve) => {
    let settled = false
    let timer = null
    let channel = null

    const finish = (state) => {
      if (settled) return
      settled = true
      if (timer) window.clearInterval(timer)
      if (channel) supabase.removeChannel(channel)
      resolve(state)
    }

    const apply = (state) => {
      if (FINAL_STATES.includes(state)) finish(state)
    }

    const poll = async () => {
      if (settled) return
      const { data } = await supabase
        .from('drawing_pdf')
        .select('quantity_state')
        .eq('id', drawingFileId)
        .maybeSingle()

      const state = data?.quantity_state
      apply(state)
      if (!settled && Date.now() - started >= WAIT_MS) {
        finish(state === 'running' ? 'running' : 'failed')
      }
    }

    channel = supabase
      .channel(`drawing-quantity-${drawingFileId}-${started}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drawing_pdf',
          filter: `id=eq.${drawingFileId}`,
        },
        (payload) => apply(payload.new?.quantity_state),
      )
      .subscribe()

    timer = window.setInterval(() => {
      void poll()
    }, POLL_MS)
    void poll()
  })
}
