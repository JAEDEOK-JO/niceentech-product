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

/** 모듈 싱글톤 — AppBar / AttendancePage가 동일 unreadCount를 공유 */
const notifications = ref<AttendanceRequestNotification[]>([])
const unreadCount = ref(0)
const loading = ref(false)

let channel: ReturnType<typeof subscribeAttendanceNotifications> | null = null
let trackedUserId = ''
let trackedIsAdmin = false
let subscriberCount = 0
let refreshPromise: Promise<void> | null = null

const clearState = () => {
  notifications.value = []
  unreadCount.value = 0
  loading.value = false
}

const refresh = async () => {
  if (!trackedUserId || !trackedIsAdmin) {
    clearState()
    return
  }

  if (refreshPromise) return refreshPromise

  loading.value = true
  const requestUserId = trackedUserId
  refreshPromise = (async () => {
    try {
      const [items, count] = await Promise.all([
        fetchAttendanceNotifications(requestUserId),
        fetchUnreadAttendanceNotificationCount(requestUserId),
      ])
      if (trackedUserId !== requestUserId) return
      notifications.value = items
      unreadCount.value = count
    } catch {
      if (trackedUserId !== requestUserId) return
      notifications.value = []
      unreadCount.value = 0
    } finally {
      loading.value = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

const stopTracking = () => {
  if (channel) {
    unsubscribeAttendanceNotifications(channel)
    channel = null
  }
  trackedUserId = ''
  trackedIsAdmin = false
  clearState()
}

const startTracking = async (userId: string, role: string) => {
  const normalizedUserId = String(userId ?? '').trim()
  const isAdmin = isAdminRole(role)

  if (!normalizedUserId || !isAdmin) {
    stopTracking()
    return
  }

  trackedIsAdmin = true

  if (trackedUserId === normalizedUserId && channel) {
    await refresh()
    return
  }

  if (channel) {
    unsubscribeAttendanceNotifications(channel)
    channel = null
  }

  trackedUserId = normalizedUserId
  await refresh()
  channel = subscribeAttendanceNotifications(normalizedUserId, () => {
    void refresh()
  })
}

export function useAttendanceNotifications(session: SessionRef, profile: ProfileRef) {
  subscriberCount += 1

  watch(
    () => [session.value?.user?.id ?? '', profile.value?.role ?? ''] as const,
    ([userId, role]) => {
      void startTracking(userId, role)
    },
    { immediate: true },
  )

  onUnmounted(() => {
    subscriberCount = Math.max(0, subscriberCount - 1)
    if (subscriberCount === 0) {
      stopTracking()
    }
  })

  const markAsRead = async (notificationId: number) => {
    const userId = trackedUserId || session.value?.user?.id || ''
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
    const userId = trackedUserId || session.value?.user?.id || ''
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

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
  }
}
