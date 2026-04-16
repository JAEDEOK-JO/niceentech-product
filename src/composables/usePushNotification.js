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

  const removeSubscription = async (userId) => {
    if (!isSupported.value) return
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
    } catch {}
  }

  // 로그인 후 호출 - 이미 허용된 경우 자동 구독 등록
  const subscribeIfPermitted = async (userId) => {
    if (!isSupported.value || !userId || !VAPID_PUBLIC_KEY) return
    if (permission.value !== 'granted') return

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
    } catch {}
  }

  // 사용자가 직접 알림 허용 요청 (설정 페이지 등에서 호출)
  const requestPermission = async (userId) => {
    if (!isSupported.value || !userId || !VAPID_PUBLIC_KEY) return 'unsupported'

    const result = await Notification.requestPermission()
    permission.value = result
    if (result !== 'granted') return result

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
    } catch {}

    return result
  }

  return { isSupported, permission, subscribeIfPermitted, requestPermission, removeSubscription }
}
