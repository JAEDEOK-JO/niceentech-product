<script setup>
import { useRouter } from 'vue-router'
import SalesExecutiveReportExampleView from '@/features/management-guide/SalesExecutiveReportExampleView.vue'

const router = useRouter()

const goBack = () => {
  router.push({ name: 'management-guide' })
}
</script>

<template>
  <SalesExecutiveReportExampleView @go-back="goBack" />
</template>
