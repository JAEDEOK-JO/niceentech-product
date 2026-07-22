<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  fetchProductDrawingFiles,
  type ProductDrawingFileItem,
} from '../services/productDrawingSearch.service'

const props = defineProps<{
  open: boolean
  productId: number | null
  initialFiles?: ProductDrawingFileItem[]
}>()

const emit = defineEmits<{
  close: []
}>()

const loading = ref(false)
const errorMessage = ref('')
const files = ref<ProductDrawingFileItem[]>([])

const loadFiles = async () => {
  const productId = Number(props.productId ?? 0)

  // productId 있으면 DB에서 실제 파일명 포함 목록 조회
  if (productId) {
    loading.value = true
    errorMessage.value = ''
    const result = await fetchProductDrawingFiles(productId)
    loading.value = false

    if (result.ok && result.files.length > 0) {
      files.value = result.files
      return
    }
    if (!result.ok) {
      errorMessage.value = '조회 실패'
    }
  }

  const seeded = (props.initialFiles ?? []).filter((file) => file.viewUrl)
  files.value = seeded.map((file, index) => ({
    ...file,
    name: String(file.name ?? '').trim() || `파일 ${index + 1}`,
  }))
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    void loadFiles()
  },
)

const openFile = (url: string) => {
  const target = String(url ?? '').trim()
  if (!target) return
  window.open(target, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
  >
    <section
      class="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
    >
      <header class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 class="text-base font-extrabold text-slate-900">도면</h3>
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

      <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <p v-if="loading" class="px-2 py-8 text-center text-sm text-slate-400">불러오는 중...</p>
        <p v-else-if="errorMessage && files.length === 0" class="px-2 py-8 text-center text-sm text-red-500">{{ errorMessage }}</p>
        <p v-else-if="files.length === 0" class="px-2 py-8 text-center text-sm text-slate-400">도면 없음</p>
        <ul v-else class="space-y-1">
          <li v-for="(file, index) in files" :key="file.id || file.viewUrl">
            <button
              type="button"
              class="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-orange-50"
              @click="openFile(file.viewUrl)"
            >
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-xs font-extrabold text-[#c2410c]">
                {{ index + 1 }}
              </span>
              <span class="min-w-0 flex-1 break-words text-sm font-semibold leading-5 text-slate-800">
                {{ file.name || `파일 ${index + 1}` }}
              </span>
            </button>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
