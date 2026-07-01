<script setup lang="ts">
import { reactive, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import { parseDigitsInput } from '../utils/cncNumericInput'

const props = defineProps<{
  open: boolean
  saving: boolean
  company: string
  place: string
  area: string
  drawingNo: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: { kind: string; quantity: number; length: number }): void
}>()

const form = reactive({
  kind: '',
  quantity: 0,
  length: 0,
})

const resetForm = () => {
  form.kind = ''
  form.quantity = 0
  form.length = 0
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
)

const handleQuantityInput = (event: Event) => {
  form.quantity = parseDigitsInput(event)
}

const handleLengthInput = (event: Event) => {
  form.length = parseDigitsInput(event)
}

const handleSubmit = () => {
  if (!form.kind.trim() || form.quantity <= 0 || form.length <= 0) return
  emit('submit', {
    kind: form.kind.trim(),
    quantity: form.quantity,
    length: form.length,
  })
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 px-4"
  >
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-lg font-extrabold text-slate-900">CNC 등록</h2>
        <button type="button" class="text-sm font-bold text-slate-400 hover:text-slate-700" @click="emit('close')">
          닫기
        </button>
      </div>

      <div class="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <p class="font-extrabold text-slate-900">{{ company }}</p>
        <p class="font-semibold text-slate-700">{{ place }}</p>
        <p class="text-slate-600">{{ area }}</p>
        <p v-if="drawingNo" class="text-slate-600">도번 {{ drawingNo }}</p>
      </div>

      <div class="mt-5 grid gap-4">
        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">종류</span>
          <Input
            v-model="form.kind"
            type="text"
            class="h-10"
            placeholder="종류 입력"
            :disabled="saving"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">길이</span>
          <Input
            :model-value="form.length > 0 ? String(form.length) : ''"
            type="text"
            inputmode="numeric"
            class="h-10"
            placeholder="숫자만 입력"
            :disabled="saving"
            @input="handleLengthInput"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">수량</span>
          <Input
            :model-value="form.quantity > 0 ? String(form.quantity) : ''"
            type="text"
            inputmode="numeric"
            class="h-10"
            placeholder="숫자만 입력"
            :disabled="saving"
            @input="handleQuantityInput"
          />
        </label>
      </div>

      <div class="mt-6 flex gap-2">
        <Button class="flex-1" variant="outline" :disabled="saving" @click="emit('close')">
          취소
        </Button>
        <Button
          class="flex-1 bg-slate-900 text-white hover:bg-slate-800"
          :disabled="saving || !form.kind.trim() || form.quantity <= 0 || form.length <= 0"
          @click="handleSubmit"
        >
          {{ saving ? '저장 중...' : '등록' }}
        </Button>
      </div>
    </div>
  </div>
</template>
