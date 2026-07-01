import { ref, watch, onUnmounted, type Ref } from 'vue'
import { isAdminRole } from '@/utils/adminAccess'
import {
  fetchAttendanceNotifications,
  fetchUnreadAttendanceNotificationCount,
  markAttendanceNotificationRead,
  markAllAttendanceNotificationsRead,
  subscribeAttendanceNotifications,
  unsubscribeAttendanceNotifications,
} from '../services/attendanceNotification.service'
import type { AttendanceRequestNotification } from '../types/attendanceNotification'

type SessionRef = Ref<{ user?: { id?: string } } | null>
type ProfileRef = Ref<{ role?: string } | null>

export function useAttendanceNotifications(session: SessionRef, profile: ProfileRef) {
  const notifications = ref<AttendanceRequestNotification[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)
  let channel: ReturnType<typeof subscribeAttendanceNotifications> | null = null

  const isAdmin = () => isAdminRole(profile.value?.role)
  const currentUserId = () => session.value?.user?.id ?? ''

  const refresh = async () => {
    const userId = currentUserId()
    if (!userId || !isAdmin()) {
      notifications.value = []
      unreadCount.value = 0
      return
    }

    loading.value = true
    try {
      const [items, count] = await Promise.all([
        fetchAttendanceNotifications(userId),
        fetchUnreadAttendanceNotificationCount(userId),
      ])
      notifications.value = items
      unreadCount.value = count
    } catch {
      notifications.value = []
      unreadCount.value = 0
    } finally {
      loading.value = false
    }
  }

  const stop = () => {
    if (channel) {
      unsubscribeAttendanceNotifications(channel)
      channel = null
    }
  }

  const start = async () => {
    stop()
    const userId = currentUserId()
    if (!userId || !isAdmin()) {
      notifications.value = []
      unreadCount.value = 0
      return
    }

    await refresh()
    channel = subscribeAttendanceNotifications(userId, () => {
      void refresh()
    })
  }

  const markAsRead = async (notificationId: number) => {
    const userId = currentUserId()
    if (!userId || !notificationId) return

    await markAttendanceNotificationRead(notificationId, userId)
    notifications.value = notifications.value.map((item) =>
      item.id === notificationId
        ? { ...item, isRead: true, readAt: new Date().toISOString() }
        : item,
    )
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  const markAllAsRead = async () => {
    const userId = currentUserId()
    if (!userId) return

    await markAllAttendanceNotificationsRead(userId)
    const readAt = new Date().toISOString()
    notifications.value = notifications.value.map((item) => ({
      ...item,
      isRead: true,
      readAt: item.readAt ?? readAt,
    }))
    unreadCount.value = 0
  }

  watch(
    () => [currentUserId(), profile.value?.role ?? ''] as const,
    () => {
      void start()
    },
    { immediate: true },
  )

  onUnmounted(stop)

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
  }
}
