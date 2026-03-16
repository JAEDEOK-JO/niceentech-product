<script setup>
import { useRouter } from 'vue-router'
import ManagementGuideView from '@/features/management-guide/ManagementGuideView.vue'

const router = useRouter()

const goHome = () => {
  router.push('/main')
}

const goDesignExample = () => {
  router.push({ name: 'design-executive-report-example' })
}

const goSalesExample = () => {
  router.push({ name: 'sales-executive-report-example' })
}

const goOperationsExample = () => {
  router.push({ name: 'operations-executive-report-example' })
}

const goProductionExample = () => {
  router.push({ name: 'production-executive-report-example' })
}
</script>

<template>
  <ManagementGuideView
    @go-home="goHome"
    @go-design-example="goDesignExample"
    @go-sales-example="goSalesExample"
    @go-operations-example="goOperationsExample"
    @go-production-example="goProductionExample"
  />
</template>
