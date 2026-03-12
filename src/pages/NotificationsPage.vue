<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import NotificationsView from '@/features/notifications/NotificationsView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { useIssueNotifications } from '@/composables/useIssueNotifications'

const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)
const {
  notifications,
  requests,
  feedbackMap,
  unreadCount,
  loading,
  error,
  fetchNotifications,
  fetchRequests,
  markAllAsRead,
  markAsRead,
  addFeedback,
  canReplyRequest,
  canDeleteRequest,
  markRequestCompleted,
  deleteRequest,
} =
  useIssueNotifications(session)

const weekOffset = ref(0)
const activeTab = ref('request')

const baseTuesday = () => {
  const now = new Date()
  const daysUntilTuesday = ((2 - now.getDay() + 7) % 7) || 7
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  base.setDate(base.getDate() + daysUntilTuesday)
  return base
}

const selectedTuesday = computed(() => {
  const tuesday = new Date(baseTuesday())
  tuesday.setDate(tuesday.getDate() + weekOffset.value * 7)
  return tuesday
})

const formatKoreanDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일`
}

const selectedTestDate = computed(() => formatKoreanDate(selectedTuesday.value))
const filteredRequests = computed(() => {
  const byDate = requests.value.filter((item) => String(item?.test_date ?? '').trim() === selectedTestDate.value)
  if (activeTab.value === 'completed') {
    return byDate.filter((item) => String(item?.request_status ?? '').trim() === '처리완료')
  }
  return byDate.filter((item) => String(item?.request_status ?? '').trim() !== '처리완료')
})

const goHome = () => {
  router.push('/main')
}

const handleRefresh = async () => {
  await fetchNotifications()
  await fetchRequests()
}

const handleMarkAllRead = async () => {
  await markAllAsRead()
}

const handleMarkRead = async (notificationId) => {
  await markAsRead({ notificationId })
}

const handleSubmitFeedback = async ({ requestId, message, onResult }) => {
  const result = await addFeedback({
    requestId,
    message,
    profile: profile.value,
  })
  onResult?.(result)
}

const canReplyFromView = (request) => canReplyRequest({ request, profile: profile.value })
const canDeleteFromView = (request) => canDeleteRequest({ request, profile: profile.value })

const handleDeleteRequest = async ({ requestId, onResult }) => {
  const result = await deleteRequest({ requestId, profile: profile.value })
  onResult?.(result)
}

const handleMarkCompleted = async ({ requestId, message, onResult }) => {
  const result = await markRequestCompleted({ requestId, profile: profile.value, message })
  onResult?.(result)
}

const handleChangeTab = (tab) => {
  activeTab.value = tab
}

const moveWeek = (delta) => {
  weekOffset.value += delta
}

const resetWeek = () => {
  weekOffset.value = 0
}
</script>

<template>
  <NotificationsView
    :notifications="notifications"
    :requests="filteredRequests"
    :feedback-map="feedbackMap"
    :unread-count="unreadCount"
    :loading="loading"
    :error="error"
    :active-tab="activeTab"
    :selected-test-date="selectedTestDate"
    :current-user-id="session?.user?.id || ''"
    :current-work-man="profile?.work_man || ''"
    :can-reply-request="canReplyFromView"
    :can-delete-request="canDeleteFromView"
    @go-home="goHome"
    @refresh="handleRefresh"
    @mark-all-read="handleMarkAllRead"
    @mark-read="handleMarkRead"
    @change-tab="handleChangeTab"
    @move-week="moveWeek"
    @reset-week="resetWeek"
    @submit-feedback="handleSubmitFeedback"
    @delete-request="handleDeleteRequest"
    @mark-completed="handleMarkCompleted"
  />
</template>
