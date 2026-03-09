<script setup>
import { useRouter } from 'vue-router'
import HomeView from '@/features/home/HomeView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { useProductionPlan } from '@/composables/useProductionPlan'
import { useHomeScheduleCard } from '@/composables/useHomeScheduleCard'
import { useIssueNotifications } from '@/composables/useIssueNotifications'

const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)
const {
  unreadCount,
  requestAlerts,
  completionAlerts,
  requests: issueRequests,
  dismissCompletionAlert,
  addFeedback,
  canReplyRequest,
  markRequestCompleted,
} = useIssueNotifications(session)
const {
  weekOffset,
  planLoading,
  planError,
  planRows,
  searchText,
  searchAllDates,
  realtimeConnected,
  pageTitle,
  selectedTuesday,
  moveWeek,
  resetWeek,
  groupedRows,
  totals,
  toggleWorkStatus,
  reorderByNo,
  updateRowMenu,
  fetchDrawingFiles,
} = useProductionPlan(session)
const { scheduleCard } = useHomeScheduleCard({ session, selectedTuesday })

const goMyPage = () => {
  router.push('/mypage')
}

const goNotifications = () => {
  router.push('/notifications')
}
const goStats = () => {
  router.push('/stats')
}
const goManagementGuide = () => {
  router.push('/management-guide')
}

const handleToggleWorkStatus = async ({ rowId, stageKey, longPressMs, onResult }) => {
  const result = await toggleWorkStatus({
    rowId,
    stageKey,
    workMan: profile.value?.work_man ?? '',
    longPressMs,
  })
  onResult?.(result)
}

const handleReorderRows = async ({ sourceRowId, targetRowId, onResult }) => {
  const result = await reorderByNo({
    sourceRowId,
    targetRowId,
    workMan: profile.value?.work_man ?? '',
  })
  onResult?.(result)
}

const handleSaveRowMenu = async ({
  rowId,
  delayText,
  delayTime,
  callType,
  complete,
  virtualDrawingDistributed,
  onResult,
}) => {
  const result = await updateRowMenu({
    rowId,
    delayText,
    delayTime,
    callType,
    complete,
    virtualDrawingDistributed,
    requester: {
      id: profile.value?.id ?? session.value?.user?.id ?? null,
      name: profile.value?.name ?? '',
      position: profile.value?.position ?? '',
      workMan: profile.value?.work_man ?? '',
    },
  })
  onResult?.(result)
}

const handleLoadDrawingFiles = async ({ rowId, onResult }) => {
  const result = await fetchDrawingFiles({ rowId })
  onResult?.(result)
}

const handleSearchChange = ({ text, allDates }) => {
  searchText.value = String(text ?? '')
  searchAllDates.value = Boolean(allDates)
}

const handleDismissReplyAlert = async (notificationId) => {
  await dismissCompletionAlert({ notificationId })
}

const canReplyRequestAlert = (alert) => {
  const targetRequest = issueRequests.value.find((item) => item.id === alert?.request_id)
  if (!targetRequest) return false
  return canReplyRequest({ request: targetRequest, profile: profile.value })
}

const handleSubmitRequestAlertReply = async ({ requestId, message, onResult }) => {
  const result = await addFeedback({
    requestId,
    message,
    profile: profile.value,
  })
  onResult?.(result)
}

const handleRequestAlertCompleted = async ({ requestId, message, onResult }) => {
  const result = await markRequestCompleted({
    requestId,
    profile: profile.value,
    message,
  })
  onResult?.(result)
}
</script>

<template>
  <HomeView
    :page-title="pageTitle"
    :realtime-connected="realtimeConnected"
    :week-offset="weekOffset"
    :plan-loading="planLoading"
    :plan-error="planError"
    :search-text="searchText"
    :search-all-dates="searchAllDates"
    :unread-notification-count="unreadCount"
    :request-alerts="requestAlerts"
    :reply-alerts="completionAlerts"
    :can-reply-request-alert="canReplyRequestAlert"
    :grouped-rows="groupedRows"
    :totals="totals"
    :schedule-card="scheduleCard"
    :profile="profile"
    :current-work-man="profile?.work_man || ''"
    @move-week="moveWeek"
    @reset-week="resetWeek"
    @go-my-page="goMyPage"
    @go-notifications="goNotifications"
    @go-stats="goStats"
    @go-management-guide="goManagementGuide"
    @toggle-work-status="handleToggleWorkStatus"
    @reorder-rows="handleReorderRows"
    @save-row-menu="handleSaveRowMenu"
    @load-drawing-files="handleLoadDrawingFiles"
    @search-change="handleSearchChange"
    @dismiss-reply-alert="handleDismissReplyAlert"
    @submit-request-alert-reply="handleSubmitRequestAlertReply"
    @complete-request-alert="handleRequestAlertCompleted"
  />
</template>
