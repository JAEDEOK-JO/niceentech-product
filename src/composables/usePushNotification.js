import { ref } from 'vue'

const isElectronEnv = typeof window !== 'undefined' && window.electronAPI?.isElectron === true

// OneSignal CDK 초기화 대기 (window.OneSignalDeferred 큐 활용)
const waitForOS = () =>
  new Promise((resolve) => {
    // 이미 초기화됐으면 즉시 반환
    if (window.OneSignal) { resolve(window.OneSignal); return }

    // 아직 초기화 전이면 OneSignalDeferred 큐에 등록
    // OneSignal SDK가 준비되면 자동으로 호출됨
    window.OneSignalDeferred = window.OneSignalDeferred || []
    const timeout = setTimeout(() => resolve(null), 6000)
    window.OneSignalDeferred.push((os) => {
      clearTimeout(timeout)
      resolve(os)
    })
  })

export function usePushNotification() {
  // ─── Electron: 웹 푸시 불필요 ────────────────────────────────────────────
  if (isElectronEnv) {
    return {
      isElectron: true,
      isSupported: ref(false),
      permission: ref('granted'),
      isSubscribed: ref(true),
      loading: ref(false),
      syncPermissionState: () => 'granted',
      refreshSubscriptionState: async () => true,
      subscribeIfPermitted: async () => ({ ok: true }),
      requestPermission: async () => ({ ok: true, status: 'granted' }),
      removeSubscription: async () => ({ ok: true }),
      onLogout: async () => {},
    }
  }

  // ─── 웹 브라우저 (OneSignal CDN) ─────────────────────────────────────────
  const isSupported = ref(
    typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window,
  )
  const permission = ref(typeof Notification !== 'undefined' ? Notification.permission : 'default')
  const isSubscribed = ref(false)
  const loading = ref(false)

  const syncPermissionState = () => {
    permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'default'
    return permission.value
  }

  const refreshSubscriptionState = async () => {
    syncPermissionState()
    if (!isSupported.value) { isSubscribed.value = false; return false }

    const os = window.OneSignal
    if (!os) { isSubscribed.value = false; return false }

    isSubscribed.value = os.User?.PushSubscription?.optedIn ?? false
    return isSubscribed.value
  }

  const subscribeIfPermitted = async (userId) => {
    syncPermissionState()
    if (!isSupported.value || !userId) return { ok: false, reason: 'unsupported' }
    if (permission.value !== 'granted') return { ok: false, reason: permission.value }

    const os = await waitForOS()
    if (!os) return { ok: false, reason: 'sdk_not_loaded' }

    try {
      await os.login(userId)
      await os.User?.PushSubscription?.optIn()
      isSubscribed.value = os.User?.PushSubscription?.optedIn ?? false
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: e?.message ?? 'subscribe_failed' }
    }
  }

  const requestPermission = async (userId) => {
    if (!userId) return { ok: false, status: 'unsupported' }
    loading.value = true

    const os = await waitForOS()

    // OneSignal 초기화 실패 시 (AppID 불일치 등) → 페이지 새로고침으로 해결
    if (!os || window.__oneSignalReady === false) {
      loading.value = false
      // 캐시 제거 후 자동 새로고침
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) {
          const url = reg.active?.scriptURL ?? ''
          if (url.includes('OneSignal') || reg.scope.includes('/push/')) await reg.unregister()
        }
      }
      window.location.reload()
      return { ok: false, status: 'reloading' }
    }

    try {
      await os.login(userId)
      const granted = await os.Notifications.requestPermission()

      permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'default'
      isSubscribed.value = granted ? (os.User?.PushSubscription?.optedIn ?? false) : false

      loading.value = false
      return { ok: !!granted, status: granted ? 'granted' : 'denied' }
    } catch (e) {
      console.warn('[PushNotification] requestPermission 실패:', e?.message)
      loading.value = false
      return { ok: false, status: 'error', reason: e?.message }
    }
  }

  const removeSubscription = async (_userId) => {
    loading.value = true
    const os = window.OneSignal
    if (!os) { loading.value = false; return { ok: false, reason: 'sdk_not_loaded' } }
    try {
      await os.User?.PushSubscription?.optOut()
      isSubscribed.value = false
      loading.value = false
      return { ok: true }
    } catch (e) {
      loading.value = false
      return { ok: false, reason: e?.message ?? 'optOut_failed' }
    }
  }

  const onLogout = async () => {
    try {
      const os = window.OneSignal
      if (os) await os.logout()
    } catch {}
    isSubscribed.value = false
  }

  return {
    isElectron: false,
    isSupported,
    permission,
    isSubscribed,
    loading,
    syncPermissionState,
    refreshSubscriptionState,
    subscribeIfPermitted,
    requestPermission,
    removeSubscription,
    onLogout,
  }
}
