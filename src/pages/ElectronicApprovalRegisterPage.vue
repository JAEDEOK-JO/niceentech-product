<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ElectronicApprovalRegisterView from '@/features/electronic-approval/ElectronicApprovalRegisterView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { isAdminRole } from '@/utils/adminAccess'

const route = useRoute()
const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)

const authorName = computed(() => String(profile.value?.name ?? '').trim())
const authorDepartment = computed(() => String(profile.value?.department ?? '').trim())
const canViewExecutive = computed(() => isAdminRole(profile.value?.role))
const initialType = computed(() => (typeof route.query.type === 'string' ? route.query.type : 'work'))

const goList = () => {
  router.push({ name: 'electronic-approval' })
}
</script>

<template>
  <ElectronicApprovalRegisterView
    :author-name="authorName"
    :author-department="authorDepartment"
    :initial-type="initialType"
    :can-view-executive="canViewExecutive"
    @go-list="goList"
  />
</template>
