<script setup>
import { useRoute, useRouter } from 'vue-router'
import AdminSalesDashboardView from '@/features/admin-dashboard/AdminSalesDashboardView.vue'
import { useAuth } from '@/composables/useAuth'
import { useSalesDashboard } from '@/composables/useSalesDashboard'

const router = useRouter()
const route = useRoute()
const { session } = useAuth()
const {
  loading,
  saving,
  error,
  selectedWeekInput,
  selectedWeekLabel,
  metricDefinitions,
  formValues,
  summaryCards,
  historyColumns,
  historyRows,
  updateMetricValue,
  saveEntries,
} = useSalesDashboard(session)

const goHome = () => {
  router.push('/main')
}
const handleWeekInputUpdate = (value) => {
  selectedWeekInput.value = value
}
const handleSave = async () => {
  await saveEntries()
}
</script>

<template>
  <AdminSalesDashboardView
    :current-path="route.path"
    :loading="loading"
    :saving="saving"
    :error="error"
    :selected-week-input="selectedWeekInput"
    :selected-week-label="selectedWeekLabel"
    :metric-definitions="metricDefinitions"
    :form-values="formValues"
    :summary-cards="summaryCards"
    :history-columns="historyColumns"
    :history-rows="historyRows"
    @go-home="goHome"
    @update:selected-week-input="handleWeekInputUpdate"
    @update-metric="updateMetricValue"
    @save="handleSave"
  />
</template>
