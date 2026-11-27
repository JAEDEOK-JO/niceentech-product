<script setup>
import { useRouter } from 'vue-router'
import OperationsExecutiveReportExampleView from '@/features/management-guide/OperationsExecutiveReportExampleView.vue'
import { getReportWeekState } from '@/features/management-guide/reportWeek'

const router = useRouter()
const { weeksAgo } = getReportWeekState('operations')

const goBack = () => {
  router.push({ name: 'reports' })
}
</script>

<template>
  <OperationsExecutiveReportExampleView :key="weeksAgo" @go-back="goBack" />
</template>
