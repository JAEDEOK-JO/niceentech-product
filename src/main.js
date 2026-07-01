import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { isDesktopBrowser } from '@/utils/device'

const app = createApp(App)
app.use(router)

const desktopBrowser = isDesktopBrowser()

if (desktopBrowser && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
    .then(() => window.caches?.keys?.())
    .then((keys) => Promise.all((keys ?? []).map((key) => window.caches.delete(key))))
    .catch((e) => console.warn('[Desktop] cache cleanup error:', e?.message))
}

app.mount('#app')
