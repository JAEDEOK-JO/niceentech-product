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
    await OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID ?? '',
      serviceWorkerParam: { scope: '/push/' },
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: import.meta.env.DEV === true,
    })
  })
}

app.mount('#app')
