<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import GlobalAppBar from '@/components/layout/GlobalAppBar.vue'
import DesktopInstallGate from '@/components/desktop/DesktopInstallGate.vue'
import AppDialog from '@/components/ui/AppDialog.vue'
import { supabase } from '@/lib/supabase'
import { usePushNotification } from '@/composables/usePushNotification'
import { isDesktopBrowser } from '@/utils/device'
import packageJson from '../package.json'

const route = useRoute()
const router = useRouter()
const showGlobalAppBar = computed(() => route.meta.requiresAuth === true)
const {
  isSupported: pushSupported,
  permission: pushPermission,
  requestPermission,
  subscribeIfPermitted,
  linkExternalUserId,
  refreshSubscriptionState,
  onLogout: pushOnLogout,
} = usePushNotification()

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
const pushPromptVisible = ref(false)
let settingsChannel = null
let authSubscription = null
let removeUpdateStatusListener = null

const PUSH_PROMPT_DISMISSED_KEY = 'push_prompt_dismissed'

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

const dismissPushPrompt = () => {
  pushPromptVisible.value = false
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, '1')
  }
}

const shouldShowPushPrompt = () => {
  if (!showGlobalAppBar.value) return false
  if (!pushSupported.value) return false
  if (pushPermission.value !== 'default') return false
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(PUSH_PROMPT_DISMISSED_KEY) !== '1'
}

const syncPushPrompt = () => {
  pushPromptVisible.value = shouldShowPushPrompt()
}

const handleEnablePush = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? ''
  if (!userId) return

  const result = await requestPermission(userId)
  if (result.ok || result.status !== 'default') {
    dismissPushPrompt()
  }
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

  // 로그인 상태이면 OneSignal에 external_user_id 매핑 (권한 여부와 무관하게)
  // 이후 사용자가 알림을 켜는 즉시 서버 발송이 연결됨
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) {
    await linkExternalUserId(session.user.id)
    await subscribeIfPermitted(session.user.id)
  } else {
    await refreshSubscriptionState()
  }
  syncPushPrompt()

  // 로그인 이벤트마다 구독 갱신
  const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
    const userId = newSession?.user?.id ?? null

    // Electron 메인 프로세스에 유저 ID 전달 (백그라운드 알림용)
    if (typeof window !== 'undefined' && window.electronAPI?.setAuthUserId) {
      window.electronAPI.setAuthUserId(userId)
    }

    if (userId) {
      await linkExternalUserId(userId)
      await subscribeIfPermitted(userId)
    } else {
      await pushOnLogout()
      await refreshSubscriptionState()
    }
    syncPushPrompt()
  })
  authSubscription = data.subscription
})

watch([showGlobalAppBar, pushPermission], () => {
  syncPushPrompt()
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
        v-if="pushPromptVisible"
        class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 px-4"
        @click.self="dismissPushPrompt"
      >
        <section class="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
          <div class="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-extrabold tracking-[0.18em] text-indigo-700">
            NOTIFICATION
          </div>
          <h2 class="mt-4 text-2xl font-extrabold text-slate-900">푸시 알림을 켜시겠어요?</h2>
          <p class="mt-3 text-sm leading-6 text-slate-600">
            메신저, 휴가 신청 등 알림을 휴대폰에서 바로 받을 수 있습니다.
          </p>
          <div class="mt-6 flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-extrabold text-slate-700"
              @click="dismissPushPrompt"
            >
              나중에
            </button>
            <button
              type="button"
              class="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-extrabold text-white"
              @click="handleEnablePush"
            >
              알림 켜기
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <!-- 강제 업데이트 다이얼로그 (닫기 불가) -->
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
