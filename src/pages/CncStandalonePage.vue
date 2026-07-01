<script setup>
import { computed, ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import { useAuth } from '@/composables/useAuth'
import CncView from '@/features/cnc/components/CncView.vue'
import CncLoginDialog from '@/features/cnc/components/CncLoginDialog.vue'

const { session, loading, message, login, logout } = useAuth()

const loginDialogOpen = ref(false)
const isLoggedIn = computed(() => Boolean(session.value))

const openLoginDialog = () => {
  loginDialogOpen.value = true
}

const handleLogin = async ({ id, password }) => {
  const ok = await login({ id, password })
  if (ok) {
    loginDialogOpen.value = false
  }
}

const handleLogout = async () => {
  await logout()
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <header class="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <h1 class="text-lg font-extrabold text-slate-900">CNC</h1>
      <Button
        v-if="!isLoggedIn"
        class="h-9 bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"
        @click="openLoginDialog"
      >
        로그인
      </Button>
      <Button
        v-else
        variant="outline"
        class="h-9 px-4 text-sm"
        @click="handleLogout"
      >
        로그아웃
      </Button>
    </header>

    <CncView v-if="isLoggedIn" standalone />

    <CncLoginDialog
      :open="loginDialogOpen"
      :loading="loading"
      :message="message"
      @close="loginDialogOpen = false"
      @login="handleLogin"
    />
  </div>
</template>
