import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)

// OneSignal 초기화 (Electron 제외, 웹 브라우저 전용)
const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron === true
if (!isElectron && typeof window !== 'undefined') {
  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      // 이전 OneSignal 서비스워커 제거 (AppID 충돌 방지)
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) {
          const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? ''
          if (url.includes('OneSignal') || reg.scope.includes('/push/')) {
            await reg.unregister()
          }
        }
      }

      await OneSignal.init({
        appId: import.meta.env.VITE_ONESIGNAL_APP_ID ?? '',
        serviceWorkerParam: { scope: '/push/' },
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      })

      window.__oneSignalReady = true
    } catch (e) {
      console.warn('[OneSignal] init error:', e?.message)
      window.__oneSignalReady = false
    }
  })
}

app.mount('#app')
