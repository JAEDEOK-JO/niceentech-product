import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
// Push 알림은 OneSignal SDK Worker(/push/OneSignalSDKWorker.js)에서 처리합니다.
