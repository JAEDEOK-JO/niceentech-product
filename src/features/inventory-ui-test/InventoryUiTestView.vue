<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { siteMeta } from './dummyData'
import InventoryUiTestSheet from './components/InventoryUiTestSheet.vue'

const router = useRouter()

const stamps = [
  { label: '담당자', value: siteMeta.manager },
  { label: '검토', value: '' },
  { label: '승인', value: '' },
]

const goBack = () => {
  router.push({ name: 'inventory' })
}
</script>

<template>
  <main class="flex h-[calc(100vh-56px)] flex-col bg-white px-4 pt-5 md:h-[calc(100vh-72px)] md:px-6">
    <section class="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3">
      <div class="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            title="입출고내역"
            aria-label="입출고내역"
            @click="goBack"
          >
            <ArrowLeft class="h-4 w-4" />
          </button>
          <h1 class="truncate text-2xl font-extrabold text-slate-900">산출&입고</h1>
        </div>
        <div class="flex">
          <div
            v-for="(stamp, index) in stamps"
            :key="stamp.label"
            class="flex h-14 w-16 flex-col border border-slate-200"
            :class="index > 0 ? 'border-l-0' : 'rounded-l-lg'"
            :style="index === stamps.length - 1 ? { borderTopRightRadius: '8px', borderBottomRightRadius: '8px' } : {}"
          >
            <span class="border-b border-slate-200 bg-slate-50 px-1 py-0.5 text-center text-[11px] font-bold text-slate-500">
              {{ stamp.label }}
            </span>
            <span class="flex flex-1 items-center justify-center text-xs font-extrabold text-slate-900">
              {{ stamp.value }}
            </span>
          </div>
        </div>
      </div>

      <InventoryUiTestSheet />
    </section>
  </main>
</template>
