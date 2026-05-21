<script setup>
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import { DEFAULT_PRINT_OPTIONS } from './pagePrint'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'print'])

const scale = ref(DEFAULT_PRINT_OPTIONS.scaleFactor)
const landscape = ref(DEFAULT_PRINT_OPTIONS.landscape)
const copies = ref(1)
const pageRangeInput = ref('')
const pageRangeError = ref('')
const printers = ref([])
const selectedPrinterName = ref('')
const printerLoading = ref(false)
const printerError = ref('')
const scalePresets = [70, 80, 90, 100, 110, 120]

const resetSettings = () => {
  scale.value = DEFAULT_PRINT_OPTIONS.scaleFactor
  landscape.value = DEFAULT_PRINT_OPTIONS.landscape
  copies.value = 1
  pageRangeInput.value = ''
  pageRangeError.value = ''
}

const selectedPrinter = computed(() =>
  printers.value.find((printer) => printer.name === selectedPrinterName.value) ?? null,
)
const defaultPrinter = computed(() =>
  printers.value.find((printer) => printer.isDefault) ?? null,
)

const loadPrinters = async () => {
  if (!window.electronAPI?.getPrinters) return
  printerLoading.value = true
  printerError.value = ''
  try {
    const list = await window.electronAPI.getPrinters()
    printers.value = Array.isArray(list) ? list : []
    selectedPrinterName.value = ''
  } catch {
    printers.value = []
    selectedPrinterName.value = ''
    printerError.value = '프린터 목록을 불러오지 못했습니다.'
  } finally {
    printerLoading.value = false
  }
}

const clampScale = () => {
  const nextScale = Number(scale.value)
  scale.value = Number.isFinite(nextScale) ? Math.max(10, Math.min(200, Math.round(nextScale))) : DEFAULT_PRINT_OPTIONS.scaleFactor
}

const clampCopies = () => {
  const nextCopies = Number(copies.value)
  copies.value = Number.isFinite(nextCopies) ? Math.max(1, Math.min(999, Math.round(nextCopies))) : 1
}

const parsePageRanges = () => {
  const value = pageRangeInput.value.trim()
  if (!value) return []

  const match = value.match(/^(\d+)(?:\s*-\s*(\d+))?$/)
  if (!match) return null

  const fromPage = Number(match[1])
  const toPage = Number(match[2] ?? match[1])
  if (!Number.isInteger(fromPage) || !Number.isInteger(toPage) || fromPage < 1 || toPage < fromPage) return null

  return [{ from: fromPage - 1, to: toPage - 1 }]
}

const submit = () => {
  clampScale()
  clampCopies()
  const pageRanges = parsePageRanges()
  if (!pageRanges) {
    pageRangeError.value = '페이지 범위는 2 또는 2-5 형식으로 입력해주세요.'
    return
  }
  pageRangeError.value = ''
  emit('print', {
    scaleFactor: scale.value,
    printBackground: true,
    landscape: landscape.value,
    pageSize: DEFAULT_PRINT_OPTIONS.pageSize,
    deviceName: selectedPrinterName.value,
    copies: copies.value,
    pageRanges,
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      resetSettings()
      void loadPrinters()
    }
  },
)
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-base font-extrabold text-slate-900">인쇄 설정</h2>
        <button type="button" class="text-sm font-bold text-slate-400 hover:text-slate-700" @click="emit('close')">닫기</button>
      </div>

      <div class="mt-5 space-y-5">
        <div>
          <div class="mb-2 flex items-center justify-between gap-3">
            <label class="text-sm font-extrabold text-slate-800">프린터</label>
            <button
              type="button"
              class="text-xs font-extrabold text-slate-500 hover:text-slate-900"
              @click="loadPrinters"
            >새로고침</button>
          </div>
          <select
            v-model="selectedPrinterName"
            class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
            :disabled="printerLoading || printers.length === 0"
          >
            <option value="">
              {{ printerLoading ? '프린터 불러오는 중...' : '시스템 기본 프린터' }}
            </option>
            <option
              v-for="printer in printers"
              :key="printer.name"
              :value="printer.name"
            >
              {{ printer.displayName }}{{ printer.isDefault ? ' (기본)' : '' }}
            </option>
          </select>
          <p v-if="selectedPrinter" class="mt-1 text-[12px] font-semibold text-slate-500">
            {{ selectedPrinter.name }}
          </p>
          <p v-else-if="defaultPrinter" class="mt-1 text-[12px] font-semibold text-slate-500">
            시스템 기본 프린터: {{ defaultPrinter.displayName || defaultPrinter.name }}
          </p>
          <p v-if="printerError" class="mt-1 text-[12px] font-bold text-red-500">{{ printerError }}</p>
        </div>

        <div>
          <label class="mb-2 block text-sm font-extrabold text-slate-800">방향</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-xl border px-4 py-3 text-sm font-extrabold transition"
              :class="!landscape ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
              @click="landscape = false"
            >세로</button>
            <button
              type="button"
              class="rounded-xl border px-4 py-3 text-sm font-extrabold transition"
              :class="landscape ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
              @click="landscape = true"
            >가로</button>
          </div>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between gap-3">
            <label class="text-sm font-extrabold text-slate-800">배율</label>
            <div class="flex items-center gap-1">
              <input
                v-model.number="scale"
                type="number"
                min="10"
                max="200"
                step="5"
                class="h-9 w-20 rounded-lg border border-slate-200 px-2 text-right text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
                @blur="clampScale"
              />
              <span class="text-sm font-bold text-slate-500">%</span>
            </div>
          </div>
          <input v-model.number="scale" type="range" min="50" max="130" step="5" class="w-full accent-slate-900" />
          <div class="mt-3 grid grid-cols-6 gap-2">
            <button
              v-for="preset in scalePresets"
              :key="preset"
              type="button"
              class="rounded-lg border px-2 py-2 text-xs font-extrabold transition"
              :class="scale === preset ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
              @click="scale = preset"
            >
              {{ preset }}%
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-2 block text-sm font-extrabold text-slate-800">인쇄 매수</label>
            <input
              v-model.number="copies"
              type="number"
              min="1"
              max="999"
              step="1"
              class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
              @blur="clampCopies"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-extrabold text-slate-800">페이지 범위</label>
            <input
              v-model="pageRangeInput"
              type="text"
              placeholder="전체 또는 2-5"
              class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
              :class="pageRangeError ? 'border-red-300 focus:border-red-400' : ''"
              @input="pageRangeError = ''"
            />
          </div>
          <p v-if="pageRangeError" class="col-span-2 text-[12px] font-bold text-red-500">{{ pageRangeError }}</p>
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Button variant="outline" class="h-10 px-4 text-sm" @click="emit('close')">취소</Button>
        <Button class="h-10 px-4 text-sm" :disabled="printerLoading" @click="submit">인쇄</Button>
      </div>
    </div>
  </div>
</template>
