import { ref, watch, type Ref } from 'vue'
import { getToken, getMessaging, isSupported, onMessage, type Messaging } from 'firebase/messaging'
import { getFirebaseApp, getFirebaseVapidKey, isFirebaseConfigured } from '@/lib/firebase'
import { deleteFcmToken, upsertFcmToken } from '../services/fcmToken.service'
import { isElectronApp } from '@/utils/device'

type SessionRef = Ref<{ user?: { id?: string } } | null>

const permissionGranted = () =>
  typeof Notification !== 'undefined' && Notification.permission === 'granted'

export function useFcmPush(session: SessionRef) {
  const enabled = ref(false)
  const currentToken = ref('')
  const errorMessage = ref('')
  let messaging: Messaging | null = null

  const canUsePush = async () => {
    if (typeof window === 'undefined') return false
    if (isElectronApp()) return false
    if (!('serviceWorker' in navigator)) return false
    if (!isFirebaseConfigured()) return false
    return isSupported()
  }

  const ensureMessaging = async () => {
    if (messaging) return messaging

    const supported = await canUsePush()
    if (!supported) return null

    const app = getFirebaseApp()
    if (!app) return null

    messaging = getMessaging(app)
    return messaging
  }

  const registerToken = async () => {
    errorMessage.value = ''

    const supported = await canUsePush()
    if (!supported) return false

    const messagingInstance = await ensureMessaging()
    if (!messagingInstance) return false

    const registration = await navigator.serviceWorker.ready
    const token = await getToken(messagingInstance, {
      vapidKey: getFirebaseVapidKey(),
      serviceWorkerRegistration: registration,
    })

    if (!token) {
      errorMessage.value = '푸시 토큰을 받지 못했습니다.'
      return false
    }

    await upsertFcmToken(token)
    currentToken.value = token
    enabled.value = true
    return true
  }

  const requestPermissionAndRegister = async () => {
    if (!(await canUsePush())) return false

    if (typeof Notification === 'undefined') return false

    if (Notification.permission === 'denied') {
      errorMessage.value = '알림 권한이 차단되어 있습니다.'
      return false
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        errorMessage.value = '알림 권한이 필요합니다.'
        return false
      }
    }

    return registerToken()
  }

  const unregister = async () => {
    if (currentToken.value) {
      await deleteFcmToken(currentToken.value)
    }
    currentToken.value = ''
    enabled.value = false
  }

  const bindForegroundMessages = async () => {
    const messagingInstance = await ensureMessaging()
    if (!messagingInstance) return

    onMessage(messagingInstance, (payload) => {
      const title = String(payload.notification?.title ?? payload.data?.title ?? '알림')
      const body = String(payload.notification?.body ?? payload.data?.body ?? '')
      if (!permissionGranted()) return
      new Notification(title, {
        body,
        icon: '/icon-192.svg',
      })
    })
  }

  const syncForSession = async (userId: string) => {
    if (!userId) {
      await unregister()
      return
    }

    await bindForegroundMessages()

    if (permissionGranted()) {
      await registerToken()
      return
    }

    await requestPermissionAndRegister()
  }

  watch(
    () => session.value?.user?.id ?? '',
    (userId) => {
      void syncForSession(userId)
    },
    { immediate: true },
  )

  return {
    enabled,
    currentToken,
    errorMessage,
    requestPermissionAndRegister,
    registerToken,
    unregister,
  }
}
