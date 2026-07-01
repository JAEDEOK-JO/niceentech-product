import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
// PWA 오프라인 캐시는 vite-plugin-pwa service worker(sw.js)에서 처리합니다.
