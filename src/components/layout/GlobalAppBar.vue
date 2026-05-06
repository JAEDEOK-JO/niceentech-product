<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useMessengerUnread } from '@/composables/useMessengerUnread'
import { useProfile } from '@/composables/useProfile'
import { useElectronBridge } from '@/composables/useElectronBridge'
import { useElectronNotifications } from '@/composables/useElectronNotifications'
import { isAdminRole, isDesignDepartment } from '@/utils/adminAccess'

const route = useRoute()
const router = useRouter()
const { session } = useAuth()
const { totalUnreadCount, startUnreadTracking, stopUnreadTracking } = useMessengerUnread()
const { profile } = useProfile(session)
const mobileMenuOpen = ref(false)

// Electron: 트레이 아이콘/배지 업데이트
useElectronBridge(totalUnreadCount)
// Electron: 새 메시지 네이티브 알림 (OneSignal 대신 Supabase 리얼타임 사용)
useElectronNotifications(session)

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
  mobileMenuOpen.value = false
  router.push(target)
}

const goMyPage = () => {
  mobileMenuOpen.value = false
  router.push({ name: 'mypage' })
}

const goSettings = () => {
  mobileMenuOpen.value = false
  router.push({ name: 'settings' })
}

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
  },
)
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white">
    <div class="flex h-[56px] items-center justify-between gap-3 px-3 md:h-[72px] md:px-6">
      <div class="flex min-w-0 items-center gap-3 md:flex-1 md:gap-5">
        <button
          type="button"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 active:bg-slate-100 md:hidden"
          aria-label="메뉴 열기"
          @click="mobileMenuOpen = true"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
          </svg>
        </button>
        <button
          type="button"
          class="shrink-0 text-base font-extrabold tracking-[0.14em] text-slate-900 md:text-lg md:tracking-[0.18em]"
          @click="goTo({ name: 'main' })"
        >
          NICEENTECH
        </button>

        <nav class="hidden min-w-0 items-center gap-2 overflow-x-auto md:flex">
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

      <div class="hidden shrink-0 items-center gap-2 md:flex">
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          @click="goSettings"
        >
          설정
        </button>
        <button
          type="button"
          class="max-w-[260px] truncate rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
          @click="goMyPage"
        >
          {{ profileSummary }}
        </button>
      </div>
    </div>

    <Transition name="mobile-nav-fade">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 top-[56px] z-50 bg-slate-950/45 md:hidden"
        @click.self="mobileMenuOpen = false"
      >
        <aside class="flex h-[calc(100dvh-56px)] w-[min(86vw,320px)] flex-col border-r border-slate-200 bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <div class="min-w-0">
              <p class="text-xs font-extrabold tracking-[0.18em] text-slate-400">NICEENTECH</p>
              <p class="mt-1 truncate text-sm font-extrabold text-slate-900">{{ profileSummary }}</p>
            </div>
            <button
              type="button"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 active:bg-slate-100"
              aria-label="메뉴 닫기"
              @click="mobileMenuOpen = false"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <nav class="flex-1 overflow-y-auto px-3 py-3">
            <button
              v-for="item in navItems"
              :key="item.key"
              type="button"
              class="mb-2 flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-extrabold transition-colors"
              :class="
                activeSection === item.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-800 active:bg-slate-100'
              "
              @click="goTo(item.to)"
            >
              <span>{{ item.label }}</span>
              <span
                v-if="Number(item.badgeCount) > 0"
                class="inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-white"
              >
                {{ Number(item.badgeCount) > 99 ? '99+' : item.badgeCount }}
              </span>
            </button>
          </nav>

          <div class="border-t border-slate-100 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              class="mb-2 flex min-h-12 w-full items-center rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-extrabold text-slate-800 active:bg-slate-50"
              @click="goMyPage"
            >
              <span class="truncate">{{ profileSummary }}</span>
            </button>
            <button
              type="button"
              class="flex min-h-12 w-full items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-800 active:bg-slate-50"
              @click="goSettings"
            >
              설정
            </button>
          </div>
        </aside>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
@media print {
  header {
    display: none !important;
  }
}

.mobile-nav-fade-enter-active,
.mobile-nav-fade-leave-active {
  transition: opacity 0.16s ease;
}

.mobile-nav-fade-enter-from,
.mobile-nav-fade-leave-to {
  opacity: 0;
}
</style>
