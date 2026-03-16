<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ElectronicApprovalMainView from '@/features/electronic-approval/ElectronicApprovalMainView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { isAdminRole } from '@/utils/adminAccess'

const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)

const userName = computed(() => String(profile.value?.name ?? '').trim())
const department = computed(() => String(profile.value?.department ?? '').trim())
const canViewExecutive = computed(() => isAdminRole(profile.value?.role))

const goHome = () => {
  router.push({ name: 'main' })
}

const goRegister = (type) => {
  router.push({
    name: 'electronic-approval-register',
    query: {
      type: typeof type === 'string' ? type : undefined,
    },
  })
}
</script>

<template>
  <ElectronicApprovalMainView
    :user-name="userName"
    :department="department"
    :can-view-executive="canViewExecutive"
    @go-home="goHome"
    @go-register="goRegister"
  />
</template>
