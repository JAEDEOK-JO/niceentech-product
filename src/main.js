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
      await OneSignal.init({
        appId: import.meta.env.VITE_ONESIGNAL_APP_ID ?? '',
        serviceWorkerParam: { scope: '/push/' },
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true, // localhost 테스트 허용
      })
    } catch (e) {
      // 도메인 불일치 등 에러 무시 (배포 환경에서는 정상 동작)
      console.warn('[OneSignal] init error:', e?.message)
    }
  })
}

app.mount('#app')
