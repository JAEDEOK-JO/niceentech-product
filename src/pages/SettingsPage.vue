<script setup>
import { computed, ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { fetchEmployees } from '@/features/attendance/services/attendance.service'
import AttendanceEmployeeMappingPanel from '@/features/attendance/components/AttendanceEmployeeMappingPanel.vue'
import EmployeeAccountRegisterPanel from '@/features/settings/components/EmployeeAccountRegisterPanel.vue'
import EmployeeOptionSettingsPanel from '@/features/settings/components/EmployeeOptionSettingsPanel.vue'
import InventoryMaterialSettingsPanel from '@/features/settings/components/InventoryMaterialSettingsPanel.vue'
import PushRecipientSettingsPanel from '@/features/settings/components/PushRecipientSettingsPanel.vue'
import { clearCacheAndReload } from '@/features/settings/services/cacheRefresh.service'
import { useVirtualKeyboardSetting } from '@/features/virtual-keyboard/composables/useVirtualKeyboardSetting'
import { isAdminRole } from '@/utils/adminAccess'
import packageJson from '../../package.json'

const appVersion = packageJson.version
const { session } = useAuth()
const { profile } = useProfile(session)
const {
  enabled: virtualKeyboardEnabled,
  loading: virtualKeyboardLoading,
  saving: virtualKeyboardSaving,
  setEnabled: setVirtualKeyboardEnabled,
  isWebHost,
} = useVirtualKeyboardSetting()
const showVirtualKeyboardSetting = isWebHost()

const isRootAdmin = computed(() => profile.value?.role === 'admin')
const isAdmin = computed(() => isAdminRole(profile.value?.role))
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
watch(
  isAdmin,
  (v) => {
    if (!v && activePanel.value === 'push-recipients') activePanel.value = 'app-info'
  },
  { immediate: true },
)
const snackMessage = ref('')
let snackTimer = null
const showSnack = (msg) => {
  snackMessage.value = msg
  if (snackTimer) clearTimeout(snackTimer)
  snackTimer = setTimeout(() => { snackMessage.value = '' }, 3000)
}

const isRefreshingCache = ref(false)
const handleCacheRefresh = async () => {
  if (isRefreshingCache.value) return

  isRefreshingCache.value = true
  try {
    await clearCacheAndReload()
  } catch (error) {
    isRefreshingCache.value = false
    showSnack(error?.message || '캐시 새로고침에 실패했습니다.')
  }
}

const handleVirtualKeyboardToggle = async (event) => {
  const next = Boolean(event?.target?.checked)
  const result = await setVirtualKeyboardEnabled(next)
  if (!result.ok) {
    showSnack(result.message || '가상키보드 설정 저장에 실패했습니다.')
    return
  }
  showSnack(next ? '가상키보드 온' : '가상키보드 오프')
}

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
          <button
            v-if="isAdmin"
            type="button"
            class="rounded-xl px-4 py-3 text-left text-sm font-extrabold transition-colors"
            :class="activePanel === 'push-recipients' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'"
            @click="activePanel = 'push-recipients'"
          >
            알림 수신
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
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">앱 버전</p>
            <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ appVersion }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">업데이트</p>
            <p class="mt-2 text-sm text-slate-600">새 버전이 배포되면 화면 하단에 알림이 표시됩니다.</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">캐시 새로고침</p>
                <p class="mt-2 text-sm text-slate-600">로그인은 유지하고 앱 캐시를 삭제한 뒤 완전히 새로고침합니다.</p>
              </div>
              <button
                type="button"
                class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                :disabled="isRefreshingCache"
                @click="handleCacheRefresh"
              >
                {{ isRefreshingCache ? '새로고침 중...' : '캐시 새로고침' }}
              </button>
            </div>
          </article>

          <article
            v-if="showVirtualKeyboardSetting"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">가상키보드</p>
              </div>
              <label class="inline-flex items-center gap-3">
                <span class="text-sm font-bold text-slate-700">
                  {{ virtualKeyboardEnabled ? '온' : '오프' }}
                </span>
                <input
                  type="checkbox"
                  class="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  :checked="virtualKeyboardEnabled"
                  :disabled="virtualKeyboardLoading || virtualKeyboardSaving"
                  @change="handleVirtualKeyboardToggle"
                />
              </label>
            </div>
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

        <PushRecipientSettingsPanel
          v-else-if="isAdmin && activePanel === 'push-recipients'"
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
