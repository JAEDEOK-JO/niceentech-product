<script setup>
import { useRouter } from 'vue-router'
import DailyProductionJournalView from '@/features/stats/DailyProductionJournalView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { useDailyProductionJournal } from '@/composables/useDailyProductionJournal'

const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)
const {
  loading,
  error,
  selectedDateText,
  selectedWeekday,
  selectedTestDateLabel,
  summary,
  processStats,
  actualOvertimeInputMin,
  actualOvertimeNote,
  saveDailyActualOvertime,
  refresh,
  moveDay,
  resetToday,
} = useDailyProductionJournal(session)

const normalizeWorkMan = (value) => String(value ?? '').replaceAll(' ', '').trim()
const isAdminWorkMan = (value) => {
  const normalized = normalizeWorkMan(value)
  return normalized.includes(normalizeWorkMan('관리자')) || normalized.includes(normalizeWorkMan('전체'))
}

const goHome = () => {
  router.push('/home')
}
const handleUpdateActualOvertimeMin = (value) => {
  actualOvertimeInputMin.value = value
}
const handleUpdateActualOvertimeNote = (value) => {
  actualOvertimeNote.value = value
}
const handleSaveDailyActual = async () => {
  const result = await saveDailyActualOvertime()
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
    :summary="summary"
    :process-stats="processStats"
    :actual-overtime-input-min="actualOvertimeInputMin"
    :actual-overtime-note="actualOvertimeNote"
    :can-edit-actual-overtime="isAdminWorkMan(profile?.work_man)"
    @go-home="goHome"
    @refresh="refresh"
    @move-day="moveDay"
    @reset-today="resetToday"
    @update:actual-overtime-input-min="handleUpdateActualOvertimeMin"
    @update:actual-overtime-note="handleUpdateActualOvertimeNote"
    @save-daily-actual="handleSaveDailyActual"
  />
</template>

