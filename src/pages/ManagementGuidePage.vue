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
</script>

<template>
  <ManagementGuideView @go-home="goHome" @go-design-example="goDesignExample" />
</template>
