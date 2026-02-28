<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import LoginView from '@/features/auth/LoginView.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { session, loading, message, login } = useAuth()

const handleLogin = async ({ id, password }) => {
  const ok = await login({ id, password })
  if (ok) {
    router.push('/home')
  }
}

watch(
  session,
  (nextSession) => {
    if (nextSession) {
      router.replace('/home')
    }
  },
  { immediate: true },
)
</script>

<template>
  <LoginView :loading="loading" :message="message" @login="handleLogin" />
</template>
