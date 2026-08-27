<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Printer } from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'
import DailyWorkSummaryBoard from '@/features/stats/dailyWorkJournal/DailyWorkSummaryBoard.vue'
import { useDailyWorkSummary } from '@/features/stats/dailyWorkJournal/useDailyWorkSummary'
import { formatIsoDate } from '@/features/stats/dailyWorkJournal/dates'
import PrintSettingsDialog from '@/features/printing/PrintSettingsDialog.vue'
import { printCurrentPage } from '@/features/printing/pagePrint'

const router = useRouter()
const {
  loading,
  error,
  selectedDate,
  pageTitle,
  canMoveNext,
  processSummaries,
  weekColumns,
  weekProcesses,
  delayedItems,
  moveDay,
  resetToday,
} = useDailyWorkSummary()

const isPrintSettingsOpen = ref(false)
const isPrinting = ref(false)

function goHome() {
  router.push('/main')
}

function goJournal() {
  router.push({ path: '/stats', query: { date: formatIsoDate(selectedDate.value) } })
}

function openPrintSettings() {
  isPrintSettingsOpen.value = true
}

async function printSummary(options = {}) {
  isPrintSettingsOpen.value = false
  await printCurrentPage(isPrinting, options, { margin: '6mm' })
}
</script>

<template>
  <section class="journal-page flex h-[calc(100dvh-56px)] flex-col overflow-hidden bg-slate-100 md:h-[calc(100vh-72px)]">
    <header class="print-hide shrink-0 border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl items-center gap-2 overflow-hidden px-4 py-2 md:px-6">
        <h1 class="mr-1 text-base font-extrabold text-slate-900">{{ pageTitle }}</h1>
        <Button class="h-8 px-2.5 text-xs" variant="outline" @click="moveDay(-1)">이전날</Button>
        <Button class="h-8 px-2.5 text-xs" variant="outline" @click="resetToday">오늘</Button>
        <Button class="h-8 px-2.5 text-xs" variant="outline" :disabled="!canMoveNext" @click="moveDay(1)">다음날</Button>
        <div class="ml-auto flex items-center gap-1">
          <Button class="h-8 px-2.5 text-xs" variant="outline" :disabled="isPrinting" @click="openPrintSettings">
            <Printer class="mr-1 h-3.5 w-3.5" />
            인쇄
          </Button>
          <Button class="h-8 px-2.5 text-xs" variant="outline" @click="goJournal">작업일지</Button>
          <Button class="h-8 px-2.5 text-xs" variant="outline" @click="goHome">홈</Button>
        </div>
      </div>
    </header>

    <h1 class="journal-print-title">{{ pageTitle }}</h1>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-7xl px-4 py-4 md:px-6">
        <DailyWorkSummaryBoard
          :process-summaries="processSummaries"
          :week-columns="weekColumns"
          :week-processes="weekProcesses"
          :delayed-items="delayedItems"
          :loading="loading"
          :error="error"
        />
      </div>
    </main>

    <PrintSettingsDialog
      :open="isPrintSettingsOpen"
      @close="isPrintSettingsOpen = false"
      @print="printSummary"
    />
  </section>
</template>

<style scoped>
.journal-print-title {
  display: none;
}

@media print {
  .print-hide {
    display: none !important;
  }

  .journal-print-title {
    display: block;
    margin: 0 0 12px;
    color: #0f172a;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.3;
  }

  .journal-page {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    background: #fff !important;
  }

  main {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  main > div {
    max-width: none !important;
    padding: 0 !important;
  }

  :deep(.overflow-x-auto),
  :deep(.overflow-hidden) {
    overflow: visible !important;
  }
}
</style>
