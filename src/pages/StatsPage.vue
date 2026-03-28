<script setup>
import { useRouter } from 'vue-router'
import DailyProductionJournalView from '@/features/stats/DailyProductionJournalView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { useDailyProductionJournal } from '@/composables/useDailyProductionJournal'
import { isAdminRole } from '@/utils/adminAccess'

const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)
const {
  loading,
  error,
  selectedDateText,
  selectedWeekday,
  selectedTestDateLabel,
  selectedDateOptions,
  canMoveNextDay,
  summary,
  weekdayPlanRows,
  lineInputs,
  updateSelectedInputDate,
  saveDailyActualOvertime,
  refresh,
  moveDay,
  resetToday,
} = useDailyProductionJournal(session)

const goHome = () => {
  router.push('/main')
}
const handleUpdateLineOvertimeMin = ({ lineType, value }) => {
  lineInputs.value[lineType].actualOvertimeInputMin = value
}
const handleUpdateLineOvertimeNote = ({ lineType, value }) => {
  lineInputs.value[lineType].actualOvertimeNote = value
}
const handleUpdateDelayInputMin = ({ lineType, value }) => {
  lineInputs.value[lineType].delayInputMin = value
}
const handleUpdateDelayReason = ({ lineType, value }) => {
  lineInputs.value[lineType].delayReason = value
}
const handleUpdateNoOvertimeChecked = ({ lineType, value }) => {
  lineInputs.value[lineType].isNoOvertimeChecked = value
  if (value) lineInputs.value[lineType].actualOvertimeInputMin = 0
}
const handleUpdateSelectedInputDate = (value) => {
  updateSelectedInputDate(value)
}
const handleSaveDailyActual = async (lineType) => {
  const result = await saveDailyActualOvertime(lineType)
  if (!result?.ok) return
}
</script>

<template>
  <DailyProductionJournalView
    :loading="loading"
    :error="error"
    :selected-date-text="selectedDateText"
    :selected-weekday="selectedWeekday"
    :selected-test-date-label="selectedTestDateLabel"
    :selected-date-options="selectedDateOptions"
    :can-move-next-day="canMoveNextDay"
    :summary="summary"
    :weekday-plan-rows="weekdayPlanRows"
    :line-inputs="lineInputs"
    :can-edit-actual-overtime="isAdminRole(profile?.role)"
    @go-home="goHome"
    @refresh="refresh"
    @move-day="moveDay"
    @reset-today="resetToday"
    @update:selected-input-date="handleUpdateSelectedInputDate"
    @update:is-no-overtime-checked="handleUpdateNoOvertimeChecked"
    @update:actual-overtime-input-min="handleUpdateLineOvertimeMin"
    @update:actual-overtime-note="handleUpdateLineOvertimeNote"
    @update:delay-input-min="handleUpdateDelayInputMin"
    @update:delay-reason="handleUpdateDelayReason"
    @save-daily-actual="handleSaveDailyActual"
  />
</template>

