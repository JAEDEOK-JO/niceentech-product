import { ref } from 'vue'

const isElectronEnv = typeof window !== 'undefined' && window.electronAPI?.isElectron === true

// OneSignal SDK 객체 생성과 init 완료는 시점이 다르므로 init 완료 플래그까지 기다린다.
const waitForOS = () =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null)
      return
    }

    const startedAt = Date.now()
    const poll = () => {
      if (window.__oneSignalReady === false) {
        resolve(null)
        return
      }
      if (window.__oneSignalReady === true && window.OneSignal?.login) {
        resolve(window.OneSignal)
        return
      }
      if (Date.now() - startedAt > 6000) {
        resolve(null)
        return
      }
      setTimeout(poll, 100)
    }

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(() => {
      setTimeout(poll, 0)
    })
    poll()
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
      linkExternalUserId: async () => ({ ok: true }),
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

  // 권한 여부와 무관하게 OneSignal에 external_user_id 매핑 (서버 발송 연결용)
  const linkExternalUserId = async (userId) => {
    if (!userId) return { ok: false, reason: 'no_user_id' }
    const os = await waitForOS()
    if (!os) return { ok: false, reason: 'sdk_not_loaded' }
    try {
      await os.login(userId)
      return { ok: true }
    } catch (e) {
      console.warn('[PushNotification] login 실패:', e?.message)
      return { ok: false, reason: e?.message ?? 'login_failed' }
    }
  }

  const subscribeIfPermitted = async (userId) => {
    syncPermissionState()
    if (!isSupported.value || !userId) return { ok: false, reason: 'unsupported' }

    const os = await waitForOS()
    if (!os) return { ok: false, reason: 'sdk_not_loaded' }

    try {
      // 권한 상태와 무관하게 external_user_id는 항상 매핑 (서버에서 찾을 수 있도록)
      await os.login(userId)

      if (permission.value === 'granted') {
        await os.User?.PushSubscription?.optIn()
        isSubscribed.value = os.User?.PushSubscription?.optedIn ?? false
      } else {
        isSubscribed.value = false
      }
      return { ok: true }
    } catch (e) {
      console.warn('[PushNotification] subscribeIfPermitted 실패:', e?.message)
      return { ok: false, reason: e?.message ?? 'subscribe_failed' }
    }
  }

  const requestPermission = async (userId) => {
    if (!userId) return { ok: false, status: 'no_user_id' }
    if (!isSupported.value) {
      return { ok: false, status: 'unsupported', reason: '브라우저가 푸시 알림을 지원하지 않습니다.' }
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      return { ok: false, status: 'denied', reason: '브라우저에서 알림이 차단되어 있어요. 주소창의 알림 설정에서 허용해주세요.' }
    }

    loading.value = true
    const os = await waitForOS()

    // OneSignal SDK 미로드/초기화 실패 시: 네이티브 Notification API로 폴백 시도
    if (!os || window.__oneSignalReady === false) {
      try {
        const nativeResult = typeof Notification !== 'undefined'
          ? await Notification.requestPermission()
          : 'default'
        permission.value = nativeResult
        loading.value = false
        return {
          ok: nativeResult === 'granted',
          status: nativeResult === 'granted' ? 'granted_native' : nativeResult,
          reason: 'OneSignal SDK 로드 실패. 브라우저 기본 알림만 활성화됩니다.',
        }
      } catch (e) {
        loading.value = false
        return { ok: false, status: 'sdk_not_loaded', reason: e?.message ?? 'OneSignal을 불러오지 못했습니다.' }
      }
    }

    try {
      // 먼저 external_user_id 매핑 (권한 부여 이후 구독이 즉시 서버에 연결되도록)
      await os.login(userId)

      // OneSignal SDK의 requestPermission은 내부적으로 Notification.requestPermission을 호출
      const granted = await os.Notifications.requestPermission()

      permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'default'

      if (granted) {
        // 권한을 받았다면 명시적으로 구독 ON
        try { await os.User?.PushSubscription?.optIn() } catch (e) {
          console.warn('[PushNotification] optIn 실패:', e?.message)
        }
        isSubscribed.value = os.User?.PushSubscription?.optedIn ?? false
      } else {
        isSubscribed.value = false
      }

      loading.value = false
      return { ok: !!granted, status: granted ? 'granted' : permission.value }
    } catch (e) {
      console.warn('[PushNotification] requestPermission 실패:', e?.message)
      loading.value = false
      return { ok: false, status: 'error', reason: e?.message ?? '알림 등록 중 오류가 발생했습니다.' }
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
    linkExternalUserId,
    requestPermission,
    removeSubscription,
    onLogout,
  }
}
