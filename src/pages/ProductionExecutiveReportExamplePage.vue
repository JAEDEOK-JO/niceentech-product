<script setup>
import { useRouter } from 'vue-router'
import ProductionExecutiveReportExampleView from '@/features/management-guide/ProductionExecutiveReportExampleView.vue'

const router = useRouter()

const goBack = () => {
  router.push({ name: 'management-guide' })
}
</script>

<template>
  <ProductionExecutiveReportExampleView @go-back="goBack" />
</template>
