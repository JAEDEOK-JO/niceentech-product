<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { isAdminRole, isDesignDepartment } from '@/utils/adminAccess'

const route = useRoute()
const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)

const profileSummary = computed(() => {
  const name = String(profile.value?.name ?? '').trim() || '사용자'
  const department = String(profile.value?.department ?? '').trim()
  return department ? `${name}(${department})` : name
})

const navItems = computed(() => {
  const items = [
    { key: 'main', label: '생산계획표01', to: { name: 'main' } },
    { key: 'home', label: '생산진행표', to: { name: 'home' } },
    { key: 'reports', label: '보고서', to: { name: 'reports' } },
  ]
  if (isAdminRole(profile.value?.role) || isDesignDepartment(profile.value?.department)) {
    items.push({ key: 'company-register', label: '회사등록', to: { name: 'company-register' } })
    items.push({ key: 'company-list', label: '회사리스트', to: { name: 'company-list' } })
  }
  return items
})

const activeSection = computed(() => {
  if (route.path.startsWith('/company/list')) return 'company-list'
  if (route.path.startsWith('/company/register')) return 'company-register'
  if (route.path.startsWith('/reports')) return 'reports'
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
            {{ item.label }}
          </button>
        </nav>
      </div>

      <button
        type="button"
        class="max-w-[180px] truncate rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50 md:max-w-[260px]"
        @click="goMyPage"
      >
        {{ profileSummary }}
      </button>
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
