<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import GlobalAppBar from '@/components/layout/GlobalAppBar.vue'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const showGlobalAppBar = computed(() => route.meta.requiresAuth === true)
const desktopSupported = computed(() => Boolean(window.desktop?.getAppInfo && window.desktop?.checkForUpdates))
const appVersion = ref('')
const remoteVersion = ref('')
const updateMessage = ref('')
const updateState = ref({
  phase: 'idle',
  message: '업데이트 대기 중',
  detail: '',
  progressPercent: 0,
  currentVersion: '',
  targetVersion: '',
  lastCheckedAt: null,
  error: '',
})
const updateDialogBusy = ref(false)
let removeUpdateListener = () => {}
let settingsChannel = null

const normalizeDesktopVersion = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^v?(\d+\.\d+\.\d+)$/)
  return matched ? matched[1] : ''
}

const resolveTargetVersion = (row) => {
  return normalizeDesktopVersion(row?.version_desktop)
}

const formatUpdateVersion = (value) => normalizeDesktopVersion(value) || String(value ?? '').trim()

const shouldShowForceUpdateDialog = computed(() => {
  if (!desktopSupported.value) return false
  if (!appVersion.value) return false
  if (!remoteVersion.value) return false
  return normalizeDesktopVersion(appVersion.value) !== normalizeDesktopVersion(remoteVersion.value)
})

const forceUpdateTitle = computed(() => {
  if (updateState.value.phase === 'downloading') return '업데이트 파일을 다운로드하는 중입니다.'
  if (updateState.value.phase === 'downloaded') return '업데이트 설치를 시작합니다.'
  if (updateState.value.phase === 'checking') return '업데이트 릴리즈를 확인하는 중입니다.'
  if (updateState.value.phase === 'error') return '업데이트 중 문제가 발생했습니다.'
  return '새 버전이 준비되었습니다.'
})

const forceUpdateDescription = computed(() => {
  if (updateState.value.phase === 'downloading' || updateState.value.phase === 'downloaded' || updateState.value.phase === 'checking') {
    return updateState.value.detail || updateState.value.message
  }
  if (updateState.value.phase === 'error') {
    return updateState.value.error || updateState.value.detail || '잠시 후 다시 시도해 주세요.'
  }
  const message = String(updateMessage.value ?? '').trim()
  if (message) return message
  return `${formatUpdateVersion(remoteVersion.value)} 버전이 배포되었습니다. 업데이트 후 계속 사용할 수 있습니다.`
})

const actionButtonLabel = computed(() => {
  if (updateState.value.phase === 'checking') return '릴리즈 확인 중...'
  if (updateState.value.phase === 'downloading') return '다운로드 중...'
  if (updateState.value.phase === 'downloaded') return '설치 준비 중...'
  return '업데이트하기'
})

const actionButtonDisabled = computed(() =>
  ['checking', 'downloading', 'downloaded'].includes(updateState.value.phase) || updateDialogBusy.value,
)

const syncAppInfo = async () => {
  if (!desktopSupported.value) return
  try {
    const info = await window.desktop.getAppInfo()
    appVersion.value = info?.version ?? ''
    if (info?.updateState) {
      updateState.value = {
        ...updateState.value,
        ...info.updateState,
      }
    }
  } catch (error) {
    updateState.value = {
      ...updateState.value,
      phase: 'error',
      message: '앱 버전을 확인하지 못했습니다.',
      detail: String(error?.message ?? error ?? ''),
      error: String(error?.message ?? error ?? ''),
    }
  }
}

const fetchDesktopSetting = async () => {
  if (!desktopSupported.value) {
    remoteVersion.value = ''
    updateMessage.value = ''
    return
  }

  const { data } = await supabase.from('setting').select('version_desktop,update_message').limit(1).maybeSingle()
  remoteVersion.value = resolveTargetVersion(data)
  updateMessage.value = String(data?.update_message ?? '').trim()
}

const stopSettingRealtime = () => {
  settingsChannel?.unsubscribe()
  settingsChannel = null
}

const setupSettingRealtime = () => {
  stopSettingRealtime()
  if (!desktopSupported.value) return

  settingsChannel = supabase
    .channel('desktop-update-version-gate')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'setting' }, async () => {
      await fetchDesktopSetting()
    })
    .subscribe()
}

const handleUpdateNow = async () => {
  if (!desktopSupported.value || actionButtonDisabled.value) return
  updateDialogBusy.value = true
  try {
    const nextState = await window.desktop.checkForUpdates({
      startDownload: true,
      targetVersion: remoteVersion.value,
    })
    if (nextState) {
      updateState.value = {
        ...updateState.value,
        ...nextState,
      }
    }
  } finally {
    updateDialogBusy.value = false
  }
}

onMounted(async () => {
  if (!desktopSupported.value) return

  removeUpdateListener = window.desktop.onUpdateStatus((payload) => {
    if (payload) {
      updateState.value = {
        ...updateState.value,
        ...payload,
      }
    }
  })

  await syncAppInfo()
  await fetchDesktopSetting()
  setupSettingRealtime()
})

onBeforeUnmount(() => {
  removeUpdateListener()
  stopSettingRealtime()
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <GlobalAppBar v-if="showGlobalAppBar" />
    <div :class="showGlobalAppBar ? 'app-with-bar pt-[72px]' : ''">
      <RouterView />
    </div>

    <div
      v-if="shouldShowForceUpdateDialog"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4"
    >
      <section class="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div class="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold tracking-[0.18em] text-white">
          UPDATE
        </div>
        <h2 class="mt-4 text-2xl font-extrabold text-slate-900">{{ forceUpdateTitle }}</h2>
        <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{{ forceUpdateDescription }}</p>

        <div class="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">현재 버전</p>
            <p class="mt-1 text-base font-extrabold text-slate-900">{{ formatUpdateVersion(appVersion) || '-' }}</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">대상 버전</p>
            <p class="mt-1 text-base font-extrabold text-slate-900">{{ formatUpdateVersion(remoteVersion) || '-' }}</p>
          </div>
        </div>

        <div v-if="Number.isFinite(updateState.progressPercent) && updateState.progressPercent > 0" class="mt-5">
          <div class="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>다운로드 진행률</span>
            <span>{{ updateState.progressPercent.toFixed(1) }}%</span>
          </div>
          <div class="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full bg-gradient-to-r from-slate-900 to-blue-600 transition-all duration-200"
              :style="{ width: `${Math.max(0, Math.min(100, updateState.progressPercent))}%` }"
            />
          </div>
        </div>

        <div
          v-if="updateState.phase === 'error' || updateState.phase === 'unavailable'"
          class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {{ updateState.error || updateState.detail || updateState.message }}
        </div>

        <button
          type="button"
          class="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="actionButtonDisabled"
          @click="handleUpdateNow"
        >
          {{ actionButtonLabel }}
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .app-with-bar {
    padding-top: 0 !important;
  }
}
</style>
