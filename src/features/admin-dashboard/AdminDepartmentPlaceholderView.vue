<script setup>
import Button from '@/components/ui/button/Button.vue'
import AdminDashboardNav from '@/features/admin-dashboard/AdminDashboardNav.vue'

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  currentPath: { type: String, default: '' },
})

const emit = defineEmits(['go-home'])
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Admin Dashboard</p>
          <h1 class="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl">{{ title }}</h1>
          <p class="mt-2 text-sm text-slate-600">{{ description || '이 부서 대시보드는 다음 단계에서 지표 입력과 통계를 연결할 예정입니다.' }}</p>
        </div>
        <Button class="shrink-0" variant="outline" @click="emit('go-home')">홈으로</Button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <AdminDashboardNav :current-path="currentPath" />

        <div class="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p class="text-sm font-bold text-slate-900">준비 중</p>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            {{ title }} 대시보드는 라우트와 기본 레이아웃까지 준비되었습니다.
          </p>
        </div>
      </section>
    </main>
  </section>
</template>
