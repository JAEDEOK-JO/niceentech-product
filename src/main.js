import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import OneSignalVuePlugin from '@onesignal/onesignal-vue3'

const app = createApp(App)
app.use(router)
app.use(OneSignalVuePlugin, {
  appId: import.meta.env.VITE_ONESIGNAL_APP_ID ?? '',
  serviceWorkerParam: { scope: '/push/' },
  notifyButton: { enable: false },
  // allowLocalhostAsSecureOrigin: import.meta.env.DEV,
})
app.mount('#app')
