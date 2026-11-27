<script setup>
import { useRouter } from 'vue-router'
import DesignExecutiveReportExampleView from '@/features/management-guide/DesignExecutiveReportExampleView.vue'
import { getReportWeekState } from '@/features/management-guide/reportWeek'

const router = useRouter()
const { weeksAgo } = getReportWeekState('design')

const goBack = () => {
  router.push({ name: 'reports' })
}
</script>

<template>
  <DesignExecutiveReportExampleView :key="weeksAgo" @go-back="goBack" />
</template>
