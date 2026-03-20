<script setup>
import { useRouter } from 'vue-router'
import SalesExecutiveAsDetailView from '@/features/management-guide/SalesExecutiveAsDetailView.vue'

const router = useRouter()

const goBack = () => {
  router.push({ name: 'sales-report' })
}
</script>

<template>
  <SalesExecutiveAsDetailView @go-back="goBack" />
</template>
