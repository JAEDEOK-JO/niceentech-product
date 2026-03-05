<script setup>
import { useRouter } from 'vue-router'
import StatsDashboardView from '@/features/stats/StatsDashboardView.vue'
import { useAuth } from '@/composables/useAuth'
import { useDailyPlanStats } from '@/composables/useDailyPlanStats'

const router = useRouter()
const { session } = useAuth()
const {
  loading,
  error,
  selectedDateText,
  selectedWeekday,
  selectedDateKey,
  summary,
  stageStats,
  formatHourMinute,
  refresh,
  moveDay,
  resetToday,
} =
  useDailyPlanStats(session)

const goHome = () => {
  router.push('/home')
}

const handleDateKeyUpdate = (value) => {
  selectedDateKey.value = value
}
</script>

<template>
  <StatsDashboardView
    :loading="loading"
    :error="error"
    :selected-date-text="selectedDateText"
    :selected-weekday="selectedWeekday"
    :selected-date-key="selectedDateKey"
    :summary="summary"
    :stage-stats="stageStats"
    :format-hour-minute="formatHourMinute"
    @go-home="goHome"
    @refresh="refresh"
    @move-day="moveDay"
    @reset-today="resetToday"
    @update:selected-date-key="handleDateKeyUpdate"
  />
</template>
