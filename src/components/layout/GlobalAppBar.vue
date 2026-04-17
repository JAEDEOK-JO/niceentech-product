<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useMessengerUnread } from '@/composables/useMessengerUnread'
import { useProfile } from '@/composables/useProfile'
import { useElectronBridge } from '@/composables/useElectronBridge'
import { isAdminRole, isDesignDepartment } from '@/utils/adminAccess'

const route = useRoute()
const router = useRouter()
const { session } = useAuth()
const { totalUnreadCount, startUnreadTracking, stopUnreadTracking } = useMessengerUnread()
const { profile } = useProfile(session)

// Electron 환경에서 트레이 아이콘 및 배지 업데이트
useElectronBridge(totalUnreadCount)

watch(
  () => session.value?.user?.id ?? '',
  (userId) => {
    if (userId) {
      void startUnreadTracking(userId)
      return
    }
    stopUnreadTracking()
  },
  { immediate: true },
)

const profileSummary = computed(() => {
  const name = String(profile.value?.name ?? '').trim() || '사용자'
  const department = String(profile.value?.department ?? '').trim()
  return department ? `${name}(${department})` : name
})

const navItems = computed(() => {
  const items = [
    { key: 'main', label: '생산계획표', to: { name: 'main' } },
    { key: 'home', label: '생산진행표', to: { name: 'home' } },
    { key: 'quality-list', label: '검수리스트', to: { name: 'quality-list' } },
    { key: 'shipment-schedule', label: '출하일정', to: { name: 'shipment-schedule' } },
    { key: 'reports', label: '보고서', to: { name: 'reports' } },
  ]
  if (isAdminRole(profile.value?.role) || isDesignDepartment(profile.value?.department)) {
    items.push({ key: 'company-register', label: '회사등록', to: { name: 'company-register' } })
    items.push({ key: 'company-list', label: '회사리스트', to: { name: 'company-list' } })
  }
  items.push({
    key: 'messenger',
    label: '메신저',
    to: { name: 'messenger' },
    badgeCount: totalUnreadCount.value,
  })
  items.push({ key: 'attendance', label: '근태관리', to: { name: 'attendance' } })
  return items
})

const activeSection = computed(() => {
  if (route.path.startsWith('/attendance')) return 'attendance'
  if (route.path.startsWith('/messenger')) return 'messenger'
  if (route.path.startsWith('/company/list')) return 'company-list'
  if (route.path.startsWith('/company/register')) return 'company-register'
  if (route.path.startsWith('/reports')) return 'reports'
  if (route.path.startsWith('/quality')) return 'quality-list'
  if (route.path.startsWith('/shipment-schedule')) return 'shipment-schedule'
  if (route.path.startsWith('/main')) return 'main'
  if (route.path.startsWith('/home')) return 'home'
  return ''
})

const goTo = (target) => {
  router.push(target)
}

const goMyPage = () => {
  router.push({ name: 'mypage' })
}

const goSettings = () => {
  router.push({ name: 'settings' })
}
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white">
    <div class="flex h-[72px] items-center justify-between gap-3 px-4 md:px-6">
      <div class="flex min-w-0 items-center gap-3 md:gap-5">
        <button
          type="button"
          class="shrink-0 text-base font-extrabold tracking-[0.18em] text-slate-900 md:text-lg"
          @click="goTo({ name: 'main' })"
        >
          NICEENTECH
        </button>
        <nav class="flex min-w-0 items-center gap-2 overflow-x-auto">
          <button
            v-for="item in navItems"
            :key="item.key"
            type="button"
            class="shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors"
            :class="
              activeSection === item.key
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="goTo(item.to)"
          >
            <span class="inline-flex items-center gap-2">
              <span>{{ item.label }}</span>
              <span
                v-if="Number(item.badgeCount) > 0"
                class="inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-white"
              >
                {{ Number(item.badgeCount) > 99 ? '99+' : item.badgeCount }}
              </span>
            </span>
          </button>
        </nav>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          @click="goSettings"
        >
          설정
        </button>
        <button
          type="button"
          class="max-w-[180px] truncate rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50 md:max-w-[260px]"
          @click="goMyPage"
        >
          {{ profileSummary }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
@media print {
  header {
    display: none !important;
  }
}
</style>
