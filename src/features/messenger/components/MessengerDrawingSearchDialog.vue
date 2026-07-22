<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  searchProductDrawings,
  type ProductDrawingSearchItem,
} from '../services/productDrawingSearch.service'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [item: ProductDrawingSearchItem]
}>()

const keyword = ref('')
const loading = ref(false)
const errorMessage = ref('')
const items = ref<ProductDrawingSearchItem[]>([])
const searched = ref(false)

const resetState = () => {
  keyword.value = ''
  loading.value = false
  errorMessage.value = ''
  items.value = []
  searched.value = false
}

watch(
  () => props.open,
  (open) => {
    if (open) resetState()
  },
)

const runSearch = async () => {
  const term = keyword.value.trim()
  if (!term) {
    items.value = []
    searched.value = false
    errorMessage.value = ''
    return
  }

  loading.value = true
  errorMessage.value = ''
  searched.value = true
  const result = await searchProductDrawings(term, 20)
  loading.value = false

  if (!result.ok) {
    items.value = []
    errorMessage.value = '검색 실패'
    return
  }
  items.value = result.items
}

const handleSelect = (item: ProductDrawingSearchItem) => {
  emit('select', item)
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
  >
    <section
      class="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
    >
      <header class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 class="text-base font-extrabold text-slate-900">요청</h3>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div class="flex gap-2 border-b border-slate-100 px-4 py-3">
        <input
          v-model="keyword"
          type="search"
          class="min-h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:bg-white"
          placeholder="현장명 · 구역명 · 회사명 · 도면번호"
          @keydown.enter.prevent="runSearch"
        />
        <button
          type="button"
          class="min-h-10 shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-40"
          :disabled="loading || !keyword.trim()"
          @click="runSearch"
        >
          검색
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <p v-if="loading" class="px-2 py-8 text-center text-sm text-slate-400">검색 중...</p>
        <p v-else-if="errorMessage" class="px-2 py-8 text-center text-sm text-red-500">{{ errorMessage }}</p>
        <p v-else-if="searched && items.length === 0" class="px-2 py-8 text-center text-sm text-slate-400">결과 없음</p>
        <ul v-else class="space-y-1">
          <li v-for="item in items" :key="item.id">
            <button
              type="button"
              class="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-indigo-50"
              @click="handleSelect(item)"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  <span class="font-extrabold text-indigo-700">{{ item.initial || '-' }}</span>
                  <span class="text-slate-400">·</span>
                  <span class="font-semibold text-slate-800">{{ item.name || '-' }}</span>
                </div>
                <div class="mt-0.5 break-words text-xs text-slate-500">
                  {{ [item.company, item.place].filter(Boolean).join(' · ') || '-' }}
                </div>
                <div
                  v-if="item.area"
                  class="mt-0.5 break-words text-xs leading-5 text-slate-500"
                >
                  {{ item.area }}
                </div>
              </div>
              <span
                class="mt-0.5 shrink-0 text-xs font-extrabold"
                :class="item.hasDrawing ? 'text-[#c2410c]' : 'text-slate-300'"
              >
                {{ item.hasDrawing ? '도면 있음' : '도면 없음' }}
              </span>
            </button>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
