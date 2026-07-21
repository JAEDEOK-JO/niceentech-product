const FORCE_UPDATE_MARKER_KEY = 'web_force_update_version'

export function clearWebForceUpdateMarker() {
  try {
    localStorage.removeItem(FORCE_UPDATE_MARKER_KEY)
  } catch {
    // ignore
  }
}

async function clearServiceWorkerAndCaches() {
  if (typeof window === 'undefined') return

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }

  if (window.caches?.keys) {
    const keys = await window.caches.keys()
    await Promise.all(keys.map((key) => window.caches.delete(key)))
  }
}

/**
 * setting.version 과 로컬 package 버전이 다르면
 * SW/캐시를 지우고 강제 새로고침한다.
 * 같은 원격 버전에 대해 무한 리로드를 막기 위해 1회만 시도한다.
 */
export async function forceWebAppUpdateIfNeeded(remoteVersion, currentVersion) {
  if (typeof window === 'undefined') return false

  const remote = String(remoteVersion ?? '').trim()
  const current = String(currentVersion ?? '').trim()
  if (!remote || !current || remote === current) {
    clearWebForceUpdateMarker()
    return false
  }

  try {
    if (localStorage.getItem(FORCE_UPDATE_MARKER_KEY) === remote) {
      return false
    }
    localStorage.setItem(FORCE_UPDATE_MARKER_KEY, remote)
  } catch {
    // storage 불가해도 강제 업데이트는 진행
  }

  await clearServiceWorkerAndCaches()

  const url = new URL(window.location.href)
  url.searchParams.set('_v', remote)
  window.location.replace(url.toString())
  return true
}

/** SW가 새 버전으로 교체되면 즉시 페이지 리로드 */
export function setupServiceWorkerAutoReload() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return () => {}

  let refreshing = false
  const onControllerChange = () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  }

  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

  const checkForUpdate = () => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      registration?.update?.()
    }).catch(() => {})
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  }

  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', checkForUpdate)

  checkForUpdate()
  const timer = window.setInterval(checkForUpdate, 60_000)

  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', checkForUpdate)
    window.clearInterval(timer)
  }
}
