<script setup>
import { useRouter } from 'vue-router'
import MyPageView from '@/features/my-page/MyPageView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'

const router = useRouter()
const { session, logout } = useAuth()
const { profile } = useProfile(session)

const goHome = () => {
  router.push('/home')
}

const handleLogout = async () => {
  await logout()
  router.replace('/login')
}
</script>

<template>
  <MyPageView :profile="profile" @go-home="goHome" @logout="handleLogout" />
</template>
