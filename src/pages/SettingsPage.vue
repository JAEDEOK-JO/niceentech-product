<script setup>
import { computed, onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { usePushNotification } from '@/composables/usePushNotification'
import packageJson from '../../package.json'

const appVersion = packageJson.version
const { session } = useAuth()
const {
  isElectron,
  isSupported,
  permission,
  isSubscribed,
  loading,
  requestPermission,
  removeSubscription,
  refreshSubscriptionState,
} = usePushNotification()

const isIos = typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
const isInStandaloneMode = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches

const notificationStatus = computed(() => {
  if (isElectron) return 'PC 앱에서는 알림이 자동으로 활성화됩니다.'
  if (isIos && !isInStandaloneMode) return 'iPhone에서 알림을 받으려면 Safari에서 "홈 화면에 추가" 후 앱을 열어 설정해주세요.'
  if (!isSupported.value) return '이 브라우저는 푸시 알림을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.'
  if (permission.value === 'denied') return '브라우저에서 알림이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.'
  if (permission.value === 'granted' && isSubscribed.value) return '메신저 푸시 알림이 켜져 있습니다.'
  if (permission.value === 'granted' && !isSubscribed.value) return '브라우저 권한은 허용되어 있습니다. 알림 켜기를 눌러 등록해주세요.'
  return '알림 켜기를 눌러 메신저 알림을 활성화하세요.'
})

const statusToneClass = computed(() => {
  if (isElectron) return 'bg-emerald-100 text-emerald-700'
  if (permission.value === 'granted' && isSubscribed.value) return 'bg-emerald-100 text-emerald-700'
  if (permission.value === 'denied') return 'bg-red-100 text-red-600'
  return 'bg-amber-100 text-amber-700'
})

// 로그인 상태 + Electron 아님 + 로딩 중 아님이면 항상 누를 수 있음
// (isSupported 체크 제거 - 누른 뒤 오류 메시지로 처리)
const canEnableNotification = computed(() => (
  !isElectron &&
  Boolean(session.value?.user?.id) &&
  !loading.value
))

const canDisableNotification = computed(() => (
  !isElectron &&
  isSupported.value &&
  Boolean(session.value?.user?.id) &&
  !loading.value &&
  isSubscribed.value
))

const handleEnableNotification = async () => {
  const userId = session.value?.user?.id ?? ''
  if (!userId) return
  await requestPermission(userId)
  await refreshSubscriptionState()
}

const handleDisableNotification = async () => {
  const userId = session.value?.user?.id ?? ''
  if (!userId) return
  await removeSubscription(userId)
  await refreshSubscriptionState()
}

// 세션이 로드된 후 구독 상태 확인 (새로고침 시 타이밍 대응)
watch(
  () => session.value?.user?.id ?? '',
  async (userId) => { if (userId) await refreshSubscriptionState() },
  { immediate: true },
)
</script>

<template>
  <main class="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-6 md:px-6">
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-2">
          <p class="text-sm font-bold text-slate-500">설정</p>
          <h1 class="text-2xl font-extrabold text-slate-900">앱 정보</h1>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="grid gap-3">
          <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">메신저 알림</p>
                <p class="mt-2 text-sm text-slate-600">{{ notificationStatus }}</p>
                <p
                  v-if="permission === 'denied'"
                  class="mt-2 text-xs text-slate-500"
                >
                  브라우저 주소창의 알림 설정 또는 사이트 권한에서 다시 허용해 주세요.
                </p>
              </div>
              <span
                class="inline-flex rounded-full px-3 py-1 text-xs font-extrabold"
                :class="statusToneClass"
              >
                {{
                  isElectron
                    ? '자동'
                    : permission === 'granted' && isSubscribed
                      ? '켜짐'
                      : permission === 'denied'
                        ? '차단됨'
                        : '꺼짐'
                }}
              </span>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                :disabled="!canEnableNotification"
                @click="handleEnableNotification"
              >
                알림 켜기
              </button>
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
                :disabled="!canDisableNotification"
                @click="handleDisableNotification"
              >
                알림 끄기
              </button>
            </div>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">앱 버전</p>
            <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ appVersion }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">업데이트</p>
            <p class="mt-2 text-sm text-slate-600">새 버전이 배포되면 화면 하단에 알림이 표시됩니다.</p>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>
