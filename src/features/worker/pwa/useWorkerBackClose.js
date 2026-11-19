import { onMounted, onUnmounted } from 'vue'
import { bindWorkerBackLayer } from './workerBackStack'

export function useWorkerBackClose(close) {
  let release = null

  onMounted(() => {
    release = bindWorkerBackLayer(() => {
      release = null
      close()
    })
  })

  onUnmounted(() => {
    if (!release) return
    const done = release
    release = null
    done()
  })
}
