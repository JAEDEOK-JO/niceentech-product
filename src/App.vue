<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import GlobalAppBar from '@/components/layout/GlobalAppBar.vue'
import DesktopInstallGate from '@/components/desktop/DesktopInstallGate.vue'
import AppDialog from '@/components/ui/AppDialog.vue'
import { supabase } from '@/lib/supabase'
import { isDesktopBrowser } from '@/utils/device'
import packageJson from '../package.json'

const route = useRoute()
const router = useRouter()
const showGlobalAppBar = computed(() => route.meta.requiresAuth === true && route.meta.standalone !== true)

const currentVersion = packageJson.version
const remoteVersion = ref('')
const updateMessage = ref('')
const updateStatus = ref({
  phase: 'idle',
  message: '',
  percent: 0,
  transferred: 0,
  total: 0,
  bytesPerSecond: 0,
})
let settingsChannel = null
let authSubscription = null
let removeUpdateStatusListener = null

const normalizeVersion = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^v?(\d+(?:\.\d+){0,3})$/)
  return matched ? matched[1] : ''
}

const compareVersion = (left, right) => {
  const leftParts = normalizeVersion(left).split('.').map((p) => Number(p) || 0)
  const rightParts = normalizeVersion(right).split('.').map((p) => Number(p) || 0)
  const len = Math.max(leftParts.length, rightParts.length, 3)
  for (let i = 0; i < len; i++) {
    const diff = (leftParts[i] ?? 0) - (rightParts[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)

const desktopInstallGateVisible = ref(isDesktopBrowser())

const hasNewVersion = computed(() => {
  if (!isElectron) return false
  if (!remoteVersion.value) return false
  return compareVersion(remoteVersion.value, currentVersion) !== 0
})

const bannerMessage = computed(() => {
  const msg = String(updateMessage.value ?? '').trim()
  if (msg) return msg
  return `${normalizeVersion(remoteVersion.value)} 버전이 배포되었습니다.`
})

const updatePercent = computed(() => Math.round(Number(updateStatus.value.percent || 0)))
const updateBusy = computed(() => ['checking', 'available', 'downloading', 'installing'].includes(updateStatus.value.phase))
const updateStatusMessage = computed(() => updateStatus.value.message || '업데이트를 준비하고 있습니다.')
const updateDetailMessage = computed(() => {
  const { phase, transferred, total, bytesPerSecond } = updateStatus.value
  if (phase !== 'downloading' || !total) return ''
  return `${formatBytes(transferred)} / ${formatBytes(total)} · ${formatBytes(bytesPerSecond)}/s`
})

const fetchSetting = async () => {
  const { data } = await supabase.from('setting').select('version,update_message').limit(1).maybeSingle()
  remoteVersion.value = normalizeVersion(data?.version)
  updateMessage.value = String(data?.update_message ?? '').trim()
}

const stopSettingRealtime = () => {
  settingsChannel?.unsubscribe()
  settingsChannel = null
}

const setupSettingRealtime = () => {
  stopSettingRealtime()
  settingsChannel = supabase
    .channel('pwa-update-version-gate')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'setting' }, async () => {
      await fetchSetting()
      if (isElectron) {
        window.electronAPI?.checkForUpdate?.()
      }
    })
    .subscribe()
}

const handleUpdate = () => {
  if (isElectron && typeof window.electronAPI?.checkForUpdate === 'function') {
    updateStatus.value = {
      phase: 'checking',
      message: '업데이트를 확인하고 있습니다.',
      percent: 0,
      transferred: 0,
      total: 0,
      bytesPerSecond: 0,
    }
    window.electronAPI.checkForUpdate()
    return
  }
  window.location.reload()
}

const formatBytes = (value) => {
  const bytes = Number(value || 0)
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / (1024 ** idx)).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`
}

const handleDesktopGateUnlocked = () => {
  desktopInstallGateVisible.value = false
  router.push({ name: 'main' })
}

// 뒤로가기/닫기 시도 차단
const blockClose = (e) => {
  if (!hasNewVersion.value) return
  e.preventDefault()
  e.returnValue = ''
}

onMounted(async () => {
  await fetchSetting()
  setupSettingRealtime()
  window.addEventListener('beforeunload', blockClose)
  removeUpdateStatusListener = window.electronAPI?.onUpdateStatus?.((status) => {
    updateStatus.value = {
      phase: status?.phase || 'idle',
      message: status?.message || '',
      percent: Number(status?.percent || 0),
      transferred: Number(status?.transferred || 0),
      total: Number(status?.total || 0),
      bytesPerSecond: Number(status?.bytesPerSecond || 0),
    }
  }) || null

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id && typeof window !== 'undefined' && window.electronAPI?.setAuthUserId) {
    window.electronAPI.setAuthUserId(session.user.id)
  }

  const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
    const userId = newSession?.user?.id ?? null
    if (typeof window !== 'undefined' && window.electronAPI?.setAuthUserId) {
      window.electronAPI.setAuthUserId(userId)
    }
  })
  authSubscription = data.subscription
})

onBeforeUnmount(() => {
  stopSettingRealtime()
  window.removeEventListener('beforeunload', blockClose)
  removeUpdateStatusListener?.()
  authSubscription?.unsubscribe()
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <AppDialog />
    <DesktopInstallGate v-if="desktopInstallGateVisible" @unlocked="handleDesktopGateUnlocked" />
    <GlobalAppBar v-if="showGlobalAppBar" />
    <div :class="showGlobalAppBar ? 'app-with-bar pt-[56px] md:pt-[72px]' : ''">
      <RouterView />
    </div>

    <Transition name="fade">
      <div
        v-if="hasNewVersion"
        class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4"
        @click.self.prevent
      >
        <section class="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
          <div class="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold tracking-[0.18em] text-white">
            UPDATE
          </div>
          <h2 class="mt-4 text-2xl font-extrabold text-slate-900">새 버전이 배포되었습니다</h2>
          <p class="mt-3 text-sm leading-6 text-slate-600">{{ bannerMessage }}</p>

          <div class="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">설치 버전</p>
              <p class="mt-1 text-base font-extrabold text-slate-900">{{ currentVersion }}</p>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">서버 버전</p>
              <p class="mt-1 text-base font-extrabold text-slate-900">{{ remoteVersion }}</p>
            </div>
          </div>

          <div v-if="isElectron && updateStatus.phase !== 'idle'" class="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-extrabold text-slate-900">{{ updateStatusMessage }}</p>
              <p class="text-sm font-extrabold text-slate-700">{{ updatePercent }}%</p>
            </div>
            <div class="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-blue-600 transition-all duration-300"
                :style="{ width: `${updatePercent}%` }"
              />
            </div>
            <p v-if="updateDetailMessage" class="mt-2 text-xs font-bold text-slate-500">{{ updateDetailMessage }}</p>
          </div>

          <button
            type="button"
            class="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-extrabold text-white disabled:bg-slate-300"
            :disabled="updateBusy"
            @click="handleUpdate"
          >
            지금 업데이트
          </button>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@media print {
  .app-with-bar {
    padding-top: 0 !important;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
