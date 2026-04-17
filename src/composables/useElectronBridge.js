import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Electron IPC 브릿지 컴포저블
 * - 읽지 않은 메시지 수 변화 시 메인 프로세스에 전달 (트레이/배지 업데이트)
 * - 메인 프로세스에서 보낸 navigate-to 이벤트 처리
 */
export function useElectronBridge(totalUnreadCount) {
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron === true
  const router = useRouter()

  if (!isElectron) return

  // 읽지 않은 수 변경 → 메인 프로세스 전달
  watch(
    totalUnreadCount,
    (count) => {
      window.electronAPI.setUnreadCount(Number(count) || 0)
    },
    { immediate: true },
  )

  // 메인 프로세스에서 알림 클릭 → 특정 경로로 이동
  onMounted(() => {
    window.electronAPI.onNavigateTo((url) => {
      if (url) router.push(url).catch(() => {})
    })
  })

  onUnmounted(() => {
    window.electronAPI.removeNavigateListener()
  })
}
