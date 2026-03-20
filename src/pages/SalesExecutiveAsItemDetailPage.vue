<script setup>
import { useRouter } from 'vue-router'
import SalesExecutiveAsItemDetailView from '@/features/management-guide/SalesExecutiveAsItemDetailView.vue'

const router = useRouter()

const goBack = () => {
  router.push({ name: 'sales-report', query: { page: '2' } })
}
</script>

<template>
  <SalesExecutiveAsItemDetailView @go-back="goBack" />
</template>
