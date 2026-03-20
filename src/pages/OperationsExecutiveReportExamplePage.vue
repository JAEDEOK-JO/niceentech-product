<script setup>
import { useRouter } from 'vue-router'
import OperationsExecutiveReportExampleView from '@/features/management-guide/OperationsExecutiveReportExampleView.vue'

const router = useRouter()

const goBack = () => {
  router.push({ name: 'reports' })
}
</script>

<template>
  <OperationsExecutiveReportExampleView @go-back="goBack" />
</template>
