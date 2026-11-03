<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AttendanceGuestScreen from '@/features/attendance/guest/AttendanceGuestScreen.vue'

const route = useRoute()
const token = computed(() => {
  const value = route.params.token
  return Array.isArray(value) ? value.join('/') : String(value ?? '')
})
</script>

<template>
  <AttendanceGuestScreen :token="token" />
</template>
