<script setup>
import { useRouter } from 'vue-router'
import ManagementGuideView from '@/features/management-guide/ManagementGuideView.vue'

const router = useRouter()

const goHome = () => {
  router.push('/home')
}
</script>

<template>
  <ManagementGuideView @go-home="goHome" />
</template>
