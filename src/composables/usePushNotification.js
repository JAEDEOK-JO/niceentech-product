import { ref } from 'vue'
import { useOneSignal } from '@onesignal/onesignal-vue3'

const isElectronEnv = typeof window !== 'undefined' && window.electronAPI?.isElectron === true

export function usePushNotification() {
  // Vue composition API 규칙: useOneSignal은 항상 호출 (조건부 호출 금지)
  const oneSignal = useOneSignal()

  // ─── Electron 환경 ───────────────────────────────────────────────────────
  // Electron에서는 OneSignal 웹 푸시 불필요
  // → useElectronNotifications이 Supabase 리얼타임으로 네이티브 알림 처리
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

  // ─── 웹 브라우저 환경 (OneSignal 웹 푸시) ─────────────────────────────────
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
    isSubscribed.value = oneSignal.User?.PushSubscription?.optedIn ?? false
    return isSubscribed.value
  }

  const ensureLoggedIn = async (userId) => {
    if (!userId) return
    try { await oneSignal.login(userId) } catch { /* 무시 */ }
  }

  const subscribeIfPermitted = async (userId) => {
    syncPermissionState()
    if (!isSupported.value || !userId) return { ok: false, reason: 'unsupported' }
    if (permission.value !== 'granted') return { ok: false, reason: permission.value }
    await ensureLoggedIn(userId)
    try {
      await oneSignal.User?.PushSubscription?.optIn()
      isSubscribed.value = oneSignal.User?.PushSubscription?.optedIn ?? false
      return { ok: true }
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'optIn_failed' }
    }
  }

  const requestPermission = async (userId) => {
    if (!isSupported.value || !userId) return { ok: false, status: 'unsupported' }
    loading.value = true
    await ensureLoggedIn(userId)
    const result = await Notification.requestPermission()
    permission.value = result
    if (result !== 'granted') {
      isSubscribed.value = false
      loading.value = false
      return { ok: false, status: result }
    }
    try {
      await oneSignal.User?.PushSubscription?.optIn()
      isSubscribed.value = oneSignal.User?.PushSubscription?.optedIn ?? false
    } catch { /* 무시 */ }
    loading.value = false
    return { ok: true, status: result }
  }

  const removeSubscription = async (_userId) => {
    loading.value = true
    try {
      await oneSignal.User?.PushSubscription?.optOut()
      isSubscribed.value = false
      return { ok: true }
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'optOut_failed' }
    } finally {
      loading.value = false
    }
  }

  const onLogout = async () => {
    try { await oneSignal.logout() } catch { /* 무시 */ }
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
