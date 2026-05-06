<script setup>
import { ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import { DEFAULT_REPORT_PRINT_OPTIONS } from './reportPrint'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'print'])

const scale = ref(DEFAULT_REPORT_PRINT_OPTIONS.scaleFactor)
const printBackground = ref(DEFAULT_REPORT_PRINT_OPTIONS.printBackground)
const landscape = ref(DEFAULT_REPORT_PRINT_OPTIONS.landscape)
const scalePresets = [70, 80, 90, 100, 110]

const resetSettings = () => {
  scale.value = DEFAULT_REPORT_PRINT_OPTIONS.scaleFactor
  printBackground.value = DEFAULT_REPORT_PRINT_OPTIONS.printBackground
  landscape.value = DEFAULT_REPORT_PRINT_OPTIONS.landscape
}

const clampScale = () => {
  const nextScale = Number(scale.value)
  scale.value = Number.isFinite(nextScale) ? Math.max(10, Math.min(200, Math.round(nextScale))) : DEFAULT_REPORT_PRINT_OPTIONS.scaleFactor
}

const submit = () => {
  clampScale()
  emit('print', {
    scaleFactor: scale.value,
    printBackground: printBackground.value,
    landscape: landscape.value,
    pageSize: DEFAULT_REPORT_PRINT_OPTIONS.pageSize,
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) resetSettings()
  },
)
</script>

<template>
  <div v-if="open" class="report-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4" @click.self="emit('close')">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-base font-extrabold text-slate-900">인쇄 설정</h2>
          <p class="mt-1 text-[12px] font-semibold text-slate-500">보고서에 맞게 배율과 배경 출력 여부를 조정합니다.</p>
        </div>
        <button type="button" class="text-sm font-bold text-slate-400 hover:text-slate-700" @click="emit('close')">닫기</button>
      </div>

      <div class="mt-5 space-y-5">
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
          <div class="mt-3 grid grid-cols-5 gap-2">
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

        <label class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span>
            <span class="block text-sm font-extrabold text-slate-800">배경 그래픽</span>
            <span class="mt-0.5 block text-[12px] font-semibold text-slate-500">색상, 배경, 차트 색을 그대로 인쇄</span>
          </span>
          <input v-model="printBackground" type="checkbox" class="h-5 w-5 accent-slate-900" />
        </label>

        <label class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span>
            <span class="block text-sm font-extrabold text-slate-800">가로 방향</span>
            <span class="mt-0.5 block text-[12px] font-semibold text-slate-500">A4 가로로 보고서 인쇄</span>
          </span>
          <input v-model="landscape" type="checkbox" class="h-5 w-5 accent-slate-900" />
        </label>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Button variant="outline" class="h-10 px-4 text-sm" @click="emit('close')">취소</Button>
        <Button class="h-10 px-4 text-sm" @click="submit">인쇄</Button>
      </div>
    </div>
  </div>
</template>
