import { isWorkerStandalone } from './workerDisplayMode'

export const WORKER_BACK_EXIT_MS = 2000

const layers = []
let suppress = 0
let armed = false
let leaving = false
let listening = false
let prompt = null
let armTimer = 0

function onPop() {
  if (suppress > 0) {
    suppress -= 1
    return
  }
  if (leaving) return

  const layer = layers.pop()
  if (layer) {
    layer.owned = false
    layer.close()
    return
  }

  if (!armed) {
    armed = true
    history.pushState({ workerBack: 'guard' }, '')
    prompt?.()
    window.clearTimeout(armTimer)
    armTimer = window.setTimeout(() => {
      armed = false
    }, WORKER_BACK_EXIT_MS)
    return
  }

  armed = false
  leaving = true
  window.clearTimeout(armTimer)
  history.back()
}

export function startWorkerBackGuard(onPrompt) {
  if (listening || !isWorkerStandalone()) return
  listening = true
  leaving = false
  prompt = onPrompt
  history.pushState({ workerBack: 'guard' }, '')
  window.addEventListener('popstate', onPop)
}

export function stopWorkerBackGuard() {
  if (!listening) return
  listening = false
  window.removeEventListener('popstate', onPop)
  window.clearTimeout(armTimer)
  layers.length = 0
  prompt = null
  armed = false
  leaving = false
}

export function bindWorkerBackLayer(close) {
  if (!listening) return () => {}
  const layer = { close, owned: true }
  layers.push(layer)
  history.pushState({ workerBack: 'layer' }, '')
  return function release() {
    const index = layers.indexOf(layer)
    if (index < 0) return
    layers.splice(index, 1)
    if (!layer.owned) return
    layer.owned = false
    suppress += 1
    history.back()
  }
}
