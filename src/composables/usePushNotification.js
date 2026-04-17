import { ref } from 'vue'
import { useOneSignal } from '@onesignal/onesignal-vue3'

export function usePushNotification() {
  const isSupported = ref(
    typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window,
  )
  const permission = ref(typeof Notification !== 'undefined' ? Notification.permission : 'default')
  const isSubscribed = ref(false)
  const loading = ref(false)

  const oneSignal = useOneSignal()

  const syncPermissionState = () => {
    permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'default'
    return permission.value
  }

  const refreshSubscriptionState = async () => {
    syncPermissionState()
    if (!isSupported.value) {
      isSubscribed.value = false
      return false
    }
    isSubscribed.value = oneSignal.User?.PushSubscription?.optedIn ?? false
    return isSubscribed.value
  }

  const ensureLoggedIn = async (userId) => {
    if (!userId) return
    try {
      await oneSignal.login(userId)
    } catch {
      // OneSignal login 실패는 무시 (구독에는 영향 없음)
    }
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
    } catch {
      // optIn 실패해도 permission은 granted이므로 일부 성공
    }

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
    try {
      await oneSignal.logout()
      isSubscribed.value = false
    } catch {
      // 무시
    }
  }

  return {
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
