<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import GlobalAppBar from '@/components/layout/GlobalAppBar.vue'
import AppDialog from '@/components/ui/AppDialog.vue'
import { supabase } from '@/lib/supabase'
import { usePushNotification } from '@/composables/usePushNotification'
import packageJson from '../package.json'

const route = useRoute()
const showGlobalAppBar = computed(() => route.meta.requiresAuth === true)
const { subscribeIfPermitted } = usePushNotification()

const currentVersion = packageJson.version
const remoteVersion = ref('')
const updateMessage = ref('')
let settingsChannel = null

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

const hasNewVersion = computed(() => {
  if (!remoteVersion.value) return false
  return compareVersion(remoteVersion.value, currentVersion) > 0
})

const bannerMessage = computed(() => {
  const msg = String(updateMessage.value ?? '').trim()
  if (msg) return msg
  return `${normalizeVersion(remoteVersion.value)} 버전이 배포되었습니다.`
})

const fetchSetting = async () => {
  const { data } = await supabase.from('setting').select('version_desktop,update_message').limit(1).maybeSingle()
  remoteVersion.value = normalizeVersion(data?.version_desktop)
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
    })
    .subscribe()
}

const handleUpdate = () => {
  window.location.reload()
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

  // 로그인 상태이면 이미 허용된 알림 구독 자동 등록
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) await subscribeIfPermitted(session.user.id)

  // 로그인 이벤트마다 구독 갱신
  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    if (newSession?.user?.id) await subscribeIfPermitted(newSession.user.id)
  })
})

onBeforeUnmount(() => {
  stopSettingRealtime()
  window.removeEventListener('beforeunload', blockClose)
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <AppDialog />
    <GlobalAppBar v-if="showGlobalAppBar" />
    <div :class="showGlobalAppBar ? 'app-with-bar pt-[72px]' : ''">
      <RouterView />
    </div>

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
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">현재 버전</p>
              <p class="mt-1 text-base font-extrabold text-slate-900">{{ currentVersion }}</p>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">새 버전</p>
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
