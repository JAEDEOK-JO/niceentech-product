/** PWA/Web Notification 공통 표시 옵션 (소리·진동·화면 알림) */
export const PUSH_NOTIFICATION_ICON = '/icon-192.svg'

export function buildPushNotificationOptions(input: {
  body?: string
  url?: string
  tag?: string
}): NotificationOptions {
  return {
    body: String(input.body ?? ''),
    icon: PUSH_NOTIFICATION_ICON,
    badge: PUSH_NOTIFICATION_ICON,
    // 무음 방지 + 진동 패턴
    silent: false,
    vibrate: [200, 100, 200, 100, 200],
    // 화면/알림센터에 오래 남겨 사용자 확인 유도
    requireInteraction: true,
    renotify: true,
    tag: input.tag || 'niceentech-push',
    data: {
      url: String(input.url ?? '/attendance'),
    },
  }
}
