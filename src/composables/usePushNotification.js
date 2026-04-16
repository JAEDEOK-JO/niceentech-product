import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

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

  const saveSubscription = async (userId, subscription) => {
    const json = subscription.toJSON()
    await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: 'user_id,endpoint' },
      )
  }

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

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      isSubscribed.value = Boolean(sub)
      return isSubscribed.value
    } catch {
      isSubscribed.value = false
      return false
    }
  }

  const ensurePushSubscription = async (userId) => {
    if (!isSupported.value || !userId || !VAPID_PUBLIC_KEY) return { ok: false, reason: 'unsupported' }

    try {
      const registration = await navigator.serviceWorker.ready
      let sub = await registration.pushManager.getSubscription()
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }
      await saveSubscription(userId, sub)
      isSubscribed.value = true
      return { ok: true }
    } catch (error) {
      isSubscribed.value = false
      return { ok: false, reason: error instanceof Error ? error.message : 'subscribe_failed' }
    }
  }

  const removeSubscription = async (userId) => {
    if (!isSupported.value) return { ok: false, reason: 'unsupported' }
    loading.value = true
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', sub.endpoint)
      }
      isSubscribed.value = false
      return { ok: true }
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'unsubscribe_failed' }
    } finally {
      loading.value = false
    }
  }

  // 로그인 후 호출 - 이미 허용된 경우 자동 구독 등록
  const subscribeIfPermitted = async (userId) => {
    syncPermissionState()
    await refreshSubscriptionState()
    if (!isSupported.value || !userId || !VAPID_PUBLIC_KEY) return { ok: false, reason: 'unsupported' }
    if (permission.value !== 'granted') return { ok: false, reason: permission.value }
    return ensurePushSubscription(userId)
  }

  // 사용자가 직접 알림 허용 요청 (설정 페이지 등에서 호출)
  const requestPermission = async (userId) => {
    if (!isSupported.value || !userId || !VAPID_PUBLIC_KEY) return { ok: false, status: 'unsupported' }

    loading.value = true
    const result = await Notification.requestPermission()
    permission.value = result
    if (result !== 'granted') {
      isSubscribed.value = false
      loading.value = false
      return { ok: false, status: result }
    }

    const subscribeResult = await ensurePushSubscription(userId)
    loading.value = false
    if (!subscribeResult.ok) {
      return { ok: false, status: result, reason: subscribeResult.reason }
    }

    return { ok: true, status: result }
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
  }
}
