<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import packageJson from '../../package.json'

const fallbackVersion = packageJson.version
const appVersion = ref(fallbackVersion)
const runtimePlatform = ref(window.desktop?.platform ?? 'web')
const updateState = ref({
  phase: 'idle',
  message: '업데이트 대기 중',
  detail: '',
  currentVersion: fallbackVersion,
  targetVersion: '',
  lastCheckedAt: null,
  error: '',
})
const checkingUpdate = ref(false)
const desktopSupported = computed(() => Boolean(window.desktop?.getAppInfo))
let removeUpdateListener = () => {}

const formatTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR')
}

const syncAppInfo = async () => {
  if (!desktopSupported.value) return
  try {
    const info = await window.desktop.getAppInfo()
    appVersion.value = info?.version ?? fallbackVersion
    runtimePlatform.value = info?.platform ?? runtimePlatform.value
    if (info?.updateState) {
      updateState.value = info.updateState
    }
  } catch (error) {
    updateState.value = {
      ...updateState.value,
      phase: 'error',
      message: '앱 정보를 불러오지 못했습니다.',
      detail: String(error?.message ?? error ?? ''),
      error: String(error?.message ?? error ?? ''),
    }
  }
}

const handleCheckForUpdates = async () => {
  if (!desktopSupported.value || checkingUpdate.value) return
  checkingUpdate.value = true
  try {
    const nextState = await window.desktop.checkForUpdates()
    if (nextState) {
      updateState.value = nextState
    }
  } finally {
    checkingUpdate.value = false
  }
}

onMounted(async () => {
  if (!desktopSupported.value) return
  removeUpdateListener = window.desktop.onUpdateStatus((payload) => {
    if (payload) {
      updateState.value = payload
    }
  })
  await syncAppInfo()
})

onBeforeUnmount(() => {
  removeUpdateListener()
})
</script>

<template>
  <main class="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-6 md:px-6">
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-2">
          <p class="text-sm font-bold text-slate-500">설정</p>
          <h1 class="text-2xl font-extrabold text-slate-900">앱 정보</h1>
          <p class="text-sm text-slate-600">현재 설치된 NICEENTECH 앱의 버전 정보를 확인할 수 있습니다.</p>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="grid gap-3 sm:grid-cols-2">
          <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">앱 버전</p>
            <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ appVersion }}</p>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">실행 환경</p>
            <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ runtimePlatform }}</p>
          </article>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex flex-col gap-1">
              <p class="text-sm font-bold text-slate-500">업데이트</p>
              <h2 class="text-xl font-extrabold text-slate-900">업데이트 상태 확인</h2>
              <p class="text-sm text-slate-600">업데이트 실패 시 상세 이유를 여기서 바로 확인할 수 있습니다.</p>
            </div>
            <button
              type="button"
              class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              :disabled="!desktopSupported || checkingUpdate"
              @click="handleCheckForUpdates"
            >
              {{ checkingUpdate ? '확인 중...' : '업데이트 확인' }}
            </button>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">현재 상태</p>
              <p class="mt-2 text-lg font-extrabold text-slate-900">{{ updateState.message }}</p>
              <p class="mt-2 text-sm text-slate-600">{{ updateState.detail || '-' }}</p>
            </article>

            <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">마지막 확인 시각</p>
              <p class="mt-2 text-lg font-extrabold text-slate-900">{{ formatTime(updateState.lastCheckedAt) }}</p>
              <p class="mt-2 text-sm text-slate-600">
                대상 버전: {{ updateState.targetVersion || '-' }}
              </p>
            </article>
          </div>

          <div
            v-if="updateState.error"
            class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700"
          >
            {{ updateState.error }}
          </div>

          <div
            v-if="!desktopSupported"
            class="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700"
          >
            웹 브라우저에서는 데스크톱 업데이트 기능을 사용할 수 없습니다.
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
