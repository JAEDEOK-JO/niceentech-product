export function isWorkerStandalone() {
  if (typeof window === 'undefined') return false
  if (navigator.standalone === true) return true
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
}

export function isIosBrowser() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '')
}
