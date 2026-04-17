import { ref, computed } from 'vue'
import { useOneSignal } from '@onesignal/onesignal-vue3'

const isElectronEnv = typeof window !== 'undefined' && window.electronAPI?.isElectron === true

export function usePushNotification() {
  // Vue composition 규칙: 항상 최상단에서 호출
  const oneSignal = useOneSignal()

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

  // ─── 웹 브라우저 ──────────────────────────────────────────────────────────
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

  // OneSignal 초기화 대기 (최대 5초)
  const waitForOneSignal = () => new Promise((resolve) => {
    if (oneSignal.User !== undefined) { resolve(); return }
    let elapsed = 0
    const timer = setInterval(() => {
      elapsed += 200
      if (oneSignal.User !== undefined || elapsed >= 5000) {
        clearInterval(timer)
        resolve()
      }
    }, 200)
  })

  const refreshSubscriptionState = async () => {
    syncPermissionState()
    if (!isSupported.value) { isSubscribed.value = false; return false }

    await waitForOneSignal()
    isSubscribed.value = oneSignal.User?.PushSubscription?.optedIn ?? false
    return isSubscribed.value
  }

  const subscribeIfPermitted = async (userId) => {
    syncPermissionState()
    if (!isSupported.value || !userId) return { ok: false, reason: 'unsupported' }
    if (permission.value !== 'granted') return { ok: false, reason: permission.value }

    try {
      await waitForOneSignal()
      await oneSignal.login(userId)
      await oneSignal.User?.PushSubscription?.optIn()
      isSubscribed.value = oneSignal.User?.PushSubscription?.optedIn ?? false
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: e?.message ?? 'subscribe_failed' }
    }
  }

  const requestPermission = async (userId) => {
    if (!isSupported.value || !userId) return { ok: false, status: 'unsupported' }
    loading.value = true

    try {
      await waitForOneSignal()

      // OneSignal 공식 방식: login + requestPermission 한번에 처리
      await oneSignal.login(userId)

      // OneSignal SDK의 requestPermission 사용 (브라우저 팝업 + 구독 등록 자동 처리)
      const granted = await oneSignal.Notifications.requestPermission()

      permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'default'

      if (granted) {
        // 구독이 자동 등록되지 않은 경우 명시적으로 optIn
        if (!oneSignal.User?.PushSubscription?.optedIn) {
          await oneSignal.User?.PushSubscription?.optIn()
        }
        isSubscribed.value = oneSignal.User?.PushSubscription?.optedIn ?? false
      } else {
        isSubscribed.value = false
      }

      loading.value = false
      return { ok: !!granted, status: granted ? 'granted' : 'denied' }
    } catch (e) {
      console.warn('[PushNotification] requestPermission error:', e?.message)
      loading.value = false
      return { ok: false, status: 'error', reason: e?.message }
    }
  }

  const removeSubscription = async (_userId) => {
    loading.value = true
    try {
      await oneSignal.User?.PushSubscription?.optOut()
      isSubscribed.value = false
      loading.value = false
      return { ok: true }
    } catch (e) {
      loading.value = false
      return { ok: false, reason: e?.message ?? 'optOut_failed' }
    }
  }

  const onLogout = async () => {
    try { await oneSignal.logout() } catch {}
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
