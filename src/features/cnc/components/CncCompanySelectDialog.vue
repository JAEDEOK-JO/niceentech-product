<script setup lang="ts">
import type { CncCompanySearchResult } from '../types/cnc'

defineProps<{
  open: boolean
  loading: boolean
  results: CncCompanySearchResult[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', item: CncCompanySearchResult): void
}>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4"
  >
    <div class="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-extrabold text-slate-900">회사 선택</h2>
        </div>
        <button type="button" class="text-slate-400 hover:text-slate-600" @click="emit('close')">
          닫기
        </button>
      </div>

      <div class="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
        <div v-if="loading" class="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          검색 중...
        </div>
        <div v-else-if="results.length === 0" class="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          검색 결과가 없습니다.
        </div>
        <button
          v-for="item in results"
          :key="item.id"
          type="button"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-slate-300 hover:bg-slate-50"
          @click="emit('select', item)"
        >
          <p class="text-sm font-extrabold text-slate-900">{{ item.company || '-' }}</p>
          <p class="mt-1 text-sm text-slate-600">{{ item.place || '-' }}</p>
          <p v-if="item.drawingNo" class="mt-1 text-xs font-bold text-slate-700">도번 {{ item.drawingNo }}</p>
          <p class="mt-1 text-xs font-bold text-slate-700">담당자 {{ item.managerName || '-' }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ item.fullName || '-' }}</p>
        </button>
      </div>
    </div>
  </div>
</template>
