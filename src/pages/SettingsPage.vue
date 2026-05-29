<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { usePushNotification } from '@/composables/usePushNotification'
import { fetchEmployees } from '@/features/attendance/services/attendance.service'
import AttendanceEmployeeMappingPanel from '@/features/attendance/components/AttendanceEmployeeMappingPanel.vue'
import EmployeeAccountRegisterPanel from '@/features/settings/components/EmployeeAccountRegisterPanel.vue'
import EmployeeOptionSettingsPanel from '@/features/settings/components/EmployeeOptionSettingsPanel.vue'
import InventoryMaterialSettingsPanel from '@/features/settings/components/InventoryMaterialSettingsPanel.vue'
import packageJson from '../../package.json'

const appVersion = packageJson.version
const { session } = useAuth()
const { profile } = useProfile(session)

const isRootAdmin = computed(() => profile.value?.role === 'admin')
const activePanel = ref('app-info')

const employees = ref([])
const loadEmployees = async () => {
  try {
    employees.value = await fetchEmployees()
  } catch {
    employees.value = []
  }
}
watch(
  isRootAdmin,
  (v) => {
    if (v) {
      loadEmployees()
      return
    }
    if (activePanel.value === 'employee-register' || activePanel.value === 'employee-options' || activePanel.value === 'inventory-materials') activePanel.value = 'app-info'
  },
  { immediate: true },
)
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

const snackMessage = ref('')
let snackTimer = null
const showSnack = (msg) => {
  snackMessage.value = msg
  if (snackTimer) clearTimeout(snackTimer)
  snackTimer = setTimeout(() => { snackMessage.value = '' }, 3000)
}

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
  if (!userId) { showSnack('로그인 후 다시 시도해주세요.'); return }
  const result = await requestPermission(userId)
  await refreshSubscriptionState()

  if (result.ok) {
    showSnack('알림이 활성화되었습니다.')
    return
  }

  const reasonMap = {
    denied: '브라우저에서 알림이 차단되어 있어요. 주소창 또는 시스템 설정에서 허용해주세요.',
    default: '알림 권한 요청이 닫혔어요. 다시 시도해주세요.',
    unsupported: '이 브라우저는 푸시 알림을 지원하지 않습니다.',
    sdk_not_loaded: 'OneSignal SDK를 불러오지 못했습니다. 네트워크 확인 후 새로고침해주세요.',
    no_user_id: '로그인 정보가 없습니다. 다시 로그인해주세요.',
  }
  showSnack(reasonMap[result.status] ?? result.reason ?? '알림 등록에 실패했습니다.')
}

const handleDisableNotification = async () => {
  const userId = session.value?.user?.id ?? ''
  if (!userId) return
  const result = await removeSubscription(userId)
  await refreshSubscriptionState()
  showSnack(result.ok ? '알림이 꺼졌습니다.' : '알림 끄기에 실패했습니다.')
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
    <div class="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[3fr_7fr]">
      <aside class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div class="px-2 py-2">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">설정</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900">관리 메뉴</h1>
        </div>
        <nav class="mt-3 grid gap-2">
          <button
            type="button"
            class="rounded-xl px-4 py-3 text-left text-sm font-extrabold transition-colors"
            :class="activePanel === 'app-info' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'"
            @click="activePanel = 'app-info'"
          >
            앱정보
          </button>
          <button
            v-if="isRootAdmin"
            type="button"
            class="rounded-xl px-4 py-3 text-left text-sm font-extrabold transition-colors"
            :class="activePanel === 'employee-register' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'"
            @click="activePanel = 'employee-register'"
          >
            사원등록
          </button>
          <button
            v-if="isRootAdmin"
            type="button"
            class="rounded-xl px-4 py-3 text-left text-sm font-extrabold transition-colors"
            :class="activePanel === 'employee-options' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'"
            @click="activePanel = 'employee-options'"
          >
            직원 선택값
          </button>
          <button
            v-if="isRootAdmin"
            type="button"
            class="rounded-xl px-4 py-3 text-left text-sm font-extrabold transition-colors"
            :class="activePanel === 'inventory-materials' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'"
            @click="activePanel = 'inventory-materials'"
          >
            자재 품목
          </button>
        </nav>
      </aside>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div v-if="activePanel === 'app-info'" class="grid gap-5">
          <div class="border-b border-slate-200 pb-4">
            <p class="text-sm font-bold text-slate-500">설정</p>
            <h1 class="mt-1 text-2xl font-extrabold text-slate-900">앱 정보</h1>
          </div>

          <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">메신저 알림</p>
                <p class="mt-2 text-sm text-slate-600">{{ notificationStatus }}</p>
                <p v-if="permission === 'denied'" class="mt-2 text-xs text-slate-500">
                  브라우저 주소창의 알림 설정 또는 사이트 권한에서 다시 허용해 주세요.
                </p>
              </div>
              <span class="inline-flex rounded-full px-3 py-1 text-xs font-extrabold" :class="statusToneClass">
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

          <article v-if="isRootAdmin" class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div class="mb-4 flex flex-col gap-1">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-red-500">ROOT ADMIN</p>
              <h2 class="text-lg font-extrabold text-slate-900">직원 ID 매칭</h2>
              <p class="text-sm text-slate-500">
                근태 엑셀의 ID를 직원목록과 연결합니다. 최초 1회만 수행하세요.
              </p>
            </div>
            <AttendanceEmployeeMappingPanel :employees="employees" @refresh-employees="loadEmployees" />
          </article>
        </div>

        <EmployeeAccountRegisterPanel
          v-else-if="isRootAdmin && activePanel === 'employee-register'"
          @registered="loadEmployees"
        />

        <EmployeeOptionSettingsPanel
          v-else-if="isRootAdmin && activePanel === 'employee-options'"
        />

        <InventoryMaterialSettingsPanel
          v-else-if="isRootAdmin && activePanel === 'inventory-materials'"
        />
      </section>
    </div>

    <div
      v-if="snackMessage"
      class="fixed left-1/2 bottom-10 z-50 -translate-x-1/2 rounded-xl bg-slate-900/95 px-6 py-3 text-sm font-bold text-white shadow-2xl max-w-[90vw] text-center"
    >
      {{ snackMessage }}
    </div>
  </main>
</template>
