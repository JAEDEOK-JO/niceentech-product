export const isElectronApp = () => {
  if (typeof window === 'undefined') return false
  return window.electronAPI?.isElectron === true
}

export const isDesktopBrowser = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (isElectronApp()) return false

  const ua = navigator.userAgent || ''
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk/i.test(ua)) {
    return false
  }

  if ((navigator.maxTouchPoints ?? 0) > 1 && /Macintosh/i.test(ua)) {
    return false
  }

  const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  return !coarsePointer
}
