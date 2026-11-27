<script setup>
import { useRouter } from 'vue-router'
import ProductionExecutiveReportExampleView from '@/features/management-guide/ProductionExecutiveReportExampleView.vue'
import { getReportWeekState } from '@/features/management-guide/reportWeek'

const router = useRouter()
const { weeksAgo } = getReportWeekState('production')

const goBack = () => {
  router.push({ name: 'reports' })
}
</script>

<template>
  <ProductionExecutiveReportExampleView :key="weeksAgo" @go-back="goBack" />
</template>
