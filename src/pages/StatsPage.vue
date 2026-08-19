<script setup>
import { useRouter } from 'vue-router'
import Button from '@/components/ui/button/Button.vue'
import DailyWorkJournalLists from '@/features/stats/dailyWorkJournal/DailyWorkJournalLists.vue'
import { useDailyWorkJournal } from '@/features/stats/dailyWorkJournal/useDailyWorkJournal'

const router = useRouter()
const {
  tabs,
  loading,
  error,
  activeTabKey,
  activeTab,
  pageTitle,
  lists,
  weekCompleted,
  inProgressQty,
  completedQty,
  inProgressInch,
  completedInch,
  moveDay,
  resetToday,
  canMoveNext,
  setTab,
} = useDailyWorkJournal()

function tabButtonClass(tab) {
  const active = tab.key === activeTabKey.value
  if (!active) return 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  if (tab.accent === 'emerald') return 'bg-emerald-600 text-white'
  if (tab.accent === 'cyan') return 'bg-cyan-600 text-white'
  if (tab.accent === 'amber') return 'bg-amber-600 text-white'
  return 'bg-violet-600 text-white'
}

function goHome() {
  router.push('/main')
}

function goMain() {
  router.push('/main')
}
</script>

<template>
  <section class="flex h-[calc(100dvh-56px)] flex-col overflow-hidden bg-slate-100 md:h-[calc(100vh-72px)]">
    <header class="shrink-0 border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl items-center gap-2 overflow-hidden px-4 py-2 md:px-6">
        <h1 class="mr-1 text-base font-extrabold text-slate-900">{{ pageTitle }}</h1>
        <Button class="h-8 px-2.5 text-xs" variant="outline" @click="moveDay(-1)">이전날</Button>
        <Button class="h-8 px-2.5 text-xs" variant="outline" @click="resetToday">오늘</Button>
        <Button class="h-8 px-2.5 text-xs" variant="outline" :disabled="!canMoveNext" @click="moveDay(1)">다음날</Button>
        <div class="flex shrink-0 gap-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-bold transition"
            :class="tabButtonClass(tab)"
            @click="setTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="ml-auto flex items-center gap-1">
          <Button class="h-8 px-2.5 text-xs" variant="outline" @click="goHome">홈</Button>
          <Button class="h-8 px-2.5 text-xs" variant="outline" @click="goMain">메인</Button>
        </div>
      </div>
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-7xl px-4 py-4 md:px-6">
        <DailyWorkJournalLists
          :tab="activeTab"
          :lists="lists"
          :week-completed="weekCompleted"
          :in-progress-qty="inProgressQty"
          :completed-qty="completedQty"
          :in-progress-inch="inProgressInch"
          :completed-inch="completedInch"
          :loading="loading"
          :error="error"
        />
      </div>
    </main>
  </section>
</template>
