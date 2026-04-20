<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import GlobalAppBar from '@/components/layout/GlobalAppBar.vue'
import AppDialog from '@/components/ui/AppDialog.vue'
import { supabase } from '@/lib/supabase'
import { usePushNotification } from '@/composables/usePushNotification'
import packageJson from '../package.json'

const route = useRoute()
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
const pushPromptVisible = ref(false)
let settingsChannel = null
let authSubscription = null

const PUSH_PROMPT_DISMISSED_KEY = 'push_prompt_dismissed'

const normalizeVersion = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^v?(\d+\.\d+\.\d+)$/)
  return matched ? matched[1] : ''
}

const compareVersion = (left, right) => {
  const leftParts = normalizeVersion(left).split('.').map((p) => Number(p) || 0)
  const rightParts = normalizeVersion(right).split('.').map((p) => Number(p) || 0)
  for (let i = 0; i < 3; i++) {
    const diff = (leftParts[i] ?? 0) - (rightParts[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)

const hasNewVersion = computed(() => {
  if (isElectron) return false
  if (!remoteVersion.value) return false
  return compareVersion(remoteVersion.value, currentVersion) !== 0
})

const bannerMessage = computed(() => {
  const msg = String(updateMessage.value ?? '').trim()
  if (msg) return msg
  return `${normalizeVersion(remoteVersion.value)} 버전이 배포되었습니다.`
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
  window.location.reload()
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
  authSubscription?.unsubscribe()
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <AppDialog />
    <GlobalAppBar v-if="showGlobalAppBar" />
    <div :class="showGlobalAppBar ? 'app-with-bar pt-[72px]' : ''">
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
          <h2 class="mt-4 text-2xl font-extrabold text-slate-900">메신저 알림을 켜시겠어요?</h2>
          <p class="mt-3 text-sm leading-6 text-slate-600">
            채팅방에 새 메시지가 오면 브라우저 푸시 알림으로 바로 받을 수 있습니다.
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

          <button
            type="button"
            class="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-extrabold text-white"
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
