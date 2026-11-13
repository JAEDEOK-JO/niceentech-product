import { ref } from 'vue'

let deferredPrompt = null
let listening = false

export const workerCanInstall = ref(false)

export function listenForWorkerInstall() {
  if (listening || typeof window === 'undefined') return
  listening = true
  const path = window.location.pathname
  if (path !== '/worker' && !path.startsWith('/worker/')) return
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
    workerCanInstall.value = true
  })
}

export async function promptWorkerInstall() {
  const event = deferredPrompt
  if (!event) return false
  deferredPrompt = null
  workerCanInstall.value = false
  await event.prompt()
  return true
}
