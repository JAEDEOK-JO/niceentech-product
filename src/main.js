import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { isDesktopBrowser } from '@/utils/device'

const app = createApp(App)
app.use(router)

// OneSignal 초기화 (Electron 제외, 웹 브라우저 전용)
const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron === true
const desktopBrowser = isDesktopBrowser()

if (desktopBrowser && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
    .then(() => window.caches?.keys?.())
    .then((keys) => Promise.all((keys ?? []).map((key) => window.caches.delete(key))))
    .catch((e) => console.warn('[Desktop] cache cleanup error:', e?.message))
}

if (!isElectron && !desktopBrowser && typeof window !== 'undefined') {
  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID ?? ''
      if (!oneSignalAppId) {
        window.__oneSignalReady = false
        return
      }

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
        appId: oneSignalAppId,
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
