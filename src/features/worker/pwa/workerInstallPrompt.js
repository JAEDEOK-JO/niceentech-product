import { ref } from 'vue'

let listening = false

export const workerCanInstall = ref(false)

const installEvent = () => (typeof window === 'undefined' ? null : window.__workerInstallEvent)

const syncInstallState = () => {
  workerCanInstall.value = Boolean(installEvent())
}

const isInAppAndroidBrowser = () => {
  const ua = navigator.userAgent || ''
  if (!/android/i.test(ua)) return false
  if (/samsungbrowser|edg\/|; wv\)|kakaotalk|naver|fbav|instagram/i.test(ua)) return true
  return !/chrome\/\d/i.test(ua)
}

const openAndroidChrome = () => {
  const target = 'niceentech-product.vercel.app/worker'
  const fallback = encodeURIComponent(`https://${target}`)
  window.location.href = `intent://${target}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`
}

export function listenForWorkerInstall() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('workerinstallready', syncInstallState)
  syncInstallState()
}

export function promptWorkerInstall() {
  const event = installEvent()
  if (event && typeof event.prompt === 'function') {
    window.__workerInstallEvent = null
    workerCanInstall.value = false
    return event.prompt()
  }
  if (isInAppAndroidBrowser()) openAndroidChrome()
  return Promise.resolve(false)
}
