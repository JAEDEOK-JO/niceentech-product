export const isElectronApp = () => {
  if (typeof window === 'undefined') return false
  return window.electronAPI?.isElectron === true
}

export const isDesktopBrowser = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (isElectronApp()) return false

  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const maxTouchPoints = navigator.maxTouchPoints ?? 0
  const userAgentDataMobile = navigator.userAgentData?.mobile === true

  if (userAgentDataMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk/i.test(ua)) {
    return false
  }

  if (maxTouchPoints > 1 && (/Macintosh/i.test(ua) || /MacIntel/i.test(platform))) {
    return false
  }

  if (typeof window.matchMedia !== 'function') return false

  const desktopWidth = window.matchMedia('(min-width: 1024px)').matches
  const finePointer = window.matchMedia('(pointer: fine)').matches
  const hoverCapable = window.matchMedia('(hover: hover)').matches
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches

  return desktopWidth && finePointer && hoverCapable && !coarsePointer
}
