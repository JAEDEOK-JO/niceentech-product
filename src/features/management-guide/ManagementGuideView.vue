<script setup>
import { computed, ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import { departments } from '@/features/management-guide/managementGuideData'

const emit = defineEmits(['go-home', 'go-design-example'])

const activeTab = ref(departments[0].key)

const currentDepartment = computed(
  () => departments.find((department) => department.key === activeTab.value) ?? departments[0],
)

const toneClasses = {
  indigo: {
    tab: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    panel: 'border-indigo-200 bg-indigo-50/50',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  emerald: {
    tab: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    panel: 'border-emerald-200 bg-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  amber: {
    tab: 'border-amber-200 bg-amber-50 text-amber-700',
    panel: 'border-amber-200 bg-amber-50/50',
    badge: 'bg-amber-100 text-amber-700',
  },
  rose: {
    tab: 'border-rose-200 bg-rose-50 text-rose-700',
    panel: 'border-rose-200 bg-rose-50/50',
    badge: 'bg-rose-100 text-rose-700',
  },
}

const getTone = (tone) =>
  toneClasses[tone] ?? {
    tab: 'border-slate-200 bg-slate-50 text-slate-700',
    panel: 'border-slate-200 bg-slate-50',
    badge: 'bg-slate-100 text-slate-700',
  }
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Department Guide</p>
          <h1 class="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl">부서별 업무 · 권한 · 보고 항목</h1>
          <p class="mt-2 text-sm text-slate-600">대표 보고용으로 부서별 담당 업무, 권한, KPI, 보고 항목을 바로 볼 수 있게 구성했습니다.</p>
        </div>
        <Button class="shrink-0" variant="outline" @click="emit('go-home')">홈으로</Button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="department in departments"
            :key="department.key"
            type="button"
            class="rounded-2xl border px-4 py-2 text-sm font-bold transition"
            :class="
              activeTab === department.key
                ? getTone(department.tone).tab
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="activeTab = department.key"
          >
            {{ department.name }}
          </button>
        </div>

        <div class="mt-5 rounded-3xl border p-5 md:p-6" :class="getTone(currentDepartment.tone).panel">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 class="mt-1 text-2xl font-extrabold text-slate-900">{{ currentDepartment.name }}</h2>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{{ currentDepartment.summary }}</p>
            </div>
            <span class="inline-flex rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap" :class="getTone(currentDepartment.tone).badge">
              {{ currentDepartment.badge }}
            </span>
          </div>

          <div class="mt-5 grid gap-4 xl:grid-cols-2">
            <article class="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-extrabold text-slate-900">부서 업무</p>
                <span class="text-xs font-semibold text-slate-500">{{ currentDepartment.standardRole.position }}</span>
              </div>
              <p class="mt-2 text-sm font-semibold text-slate-700">{{ currentDepartment.standardRole.owner }}</p>
              <ul class="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                <li v-for="task in currentDepartment.pageTasks" :key="task">• {{ task }}</li>
              </ul>
            </article>

            <article class="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm">
              <p class="text-sm font-extrabold text-slate-900">업무분장 및 권한</p>
              <div class="mt-4 grid flex-1 gap-3 md:grid-cols-3">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold text-slate-500">실무 담당 (R)</p>
                  <ul class="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                    <li v-for="item in currentDepartment.raci.responsible" :key="item">• {{ item }}</li>
                  </ul>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold text-slate-500">협의 대상 (C)</p>
                  <ul class="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                    <li v-for="item in currentDepartment.raci.consulted" :key="item">• {{ item }}</li>
                  </ul>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold text-slate-500">공유 대상 (I)</p>
                  <ul class="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                    <li v-if="currentDepartment.raci.informed.length === 0" class="text-slate-500">• 없음</li>
                    <li v-for="item in currentDepartment.raci.informed" :key="item">• {{ item }}</li>
                  </ul>
                </div>
              </div>
            </article>

            <article class="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm">
              <p class="text-sm font-extrabold text-slate-900">KPI 및 월간 보고</p>
              <div class="mt-4 grid flex-1 gap-3 md:grid-cols-2">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold text-slate-500">KPI</p>
                  <p class="mt-2 text-sm font-bold text-slate-900">{{ currentDepartment.kpi }}</p>
                  <p class="mt-2 text-sm leading-6 text-slate-700">{{ currentDepartment.kpiTarget }}</p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold text-slate-500">월간 보고</p>
                  <p class="mt-2 text-sm leading-6 text-slate-700">{{ currentDepartment.monthlyReport }}</p>
                </div>
              </div>
            </article>

            <article class="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-extrabold text-slate-900">대표이사 주요 보고 지표</p>
                <Button
                  v-if="currentDepartment.key === 'design'"
                  class="h-8 px-3 text-xs"
                  variant="outline"
                  @click="emit('go-design-example')"
                >
                  예시페이지
                </Button>
              </div>
              <ul class="mt-4 grid flex-1 gap-2 text-sm leading-6 text-slate-700 md:grid-cols-2">
                <li
                  v-for="item in currentDepartment.executiveMetrics"
                  :key="item.label"
                  class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p class="text-sm font-bold text-slate-900">{{ item.label }}</p>
                  <p class="mt-1 text-xs leading-5 text-slate-600">{{ item.description }}</p>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>
    </main>
  </section>
</template>
