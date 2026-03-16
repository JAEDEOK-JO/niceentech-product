<script setup>
import { useRouter } from 'vue-router'
import DesignExecutiveReportExampleView from '@/features/management-guide/DesignExecutiveReportExampleView.vue'

const router = useRouter()

const goBack = () => {
  router.push({ name: 'management-guide' })
}
</script>

<template>
  <DesignExecutiveReportExampleView @go-back="goBack" />
</template>
