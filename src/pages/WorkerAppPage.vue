<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorkerLoginView from '@/features/worker/components/WorkerLoginView.vue'
import WorkerShell from '@/features/worker/components/WorkerShell.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { isWorkerRole } from '@/utils/adminAccess'
import { workerTabFromQuery, type WorkerTab } from '@/features/worker/workerTab'
import { startWorkerBackGuard, stopWorkerBackGuard, WORKER_BACK_EXIT_MS } from '@/features/worker/pwa/workerBackStack'

const route = useRoute()
const router = useRouter()
const { session, ready, loading, message, login, logout } = useAuth()
const { profile, ready: profileReady } = useProfile(session)
const tab = ref<WorkerTab>(workerTabFromQuery(route.query.tab))

watch(() => route.query.tab, (value) => {
  tab.value = workerTabFromQuery(value)
})
const isWorker = computed(() => isWorkerRole(profile.value?.role))
const isApprovedWorker = computed(() => isWorker.value && profile.value?.activate !== false)

watch([ready, session, profileReady, () => profile.value?.role, () => profile.value?.activate], async () => {
  if (!ready.value || !session.value || !profileReady.value) return
  if (isWorker.value && profile.value?.activate === false) {
    await logout()
    message.value = '승인 대기'
    return
  }
  if (!isWorker.value) router.replace({ name: 'main' })
})

const handleLogin = async (payload: { id: string; password: string }) => {
  const ok = await login(payload)
  if (ok) tab.value = 'notice'
}

const handleLogout = async () => {
  tab.value = 'notice'
  await logout()
}

const exitHint = ref(false)
let exitHintTimer = 0

onMounted(() => {
  startWorkerBackGuard(() => {
    exitHint.value = true
    window.clearTimeout(exitHintTimer)
    exitHintTimer = window.setTimeout(() => {
      exitHint.value = false
    }, WORKER_BACK_EXIT_MS)
  })
})

onUnmounted(() => {
  window.clearTimeout(exitHintTimer)
  stopWorkerBackGuard()
})
</script>

<template>
  <div v-if="ready && session && profileReady && isApprovedWorker" class="min-h-dvh bg-slate-200">
    <WorkerShell
      v-model:tab="tab"
      :user-id="session?.user?.id || ''"
      :name="profile?.name || ''"
      :department="profile?.assigned_department || profile?.department || ''"
      @logout="handleLogout"
    />
  </div>
  <WorkerLoginView
    v-else-if="ready && !session"
    :loading="loading"
    :message="message"
    @login="handleLogin"
  />
  <p
    v-if="exitHint"
    class="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg"
  >
    한 번 더 누르면 종료됩니다
  </p>
</template>
