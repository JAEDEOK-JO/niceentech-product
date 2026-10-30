<script setup>
import { nextTick, ref, watch } from 'vue'
import { vVirtualKeyboard } from '@/features/virtual-keyboard/directives/vVirtualKeyboard'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit'])
const fieldEl = ref(null)

function resize() {
  const field = fieldEl.value
  if (!field) return
  field.style.height = 'auto'
  field.style.height = `${Math.min(field.scrollHeight, 160)}px`
}

function onInput(event) {
  emit('update:modelValue', event.target.value)
  resize()
}

watch(
  () => props.modelValue,
  async (value) => {
    if (value) return
    await nextTick()
    resize()
  },
)
</script>

<template>
  <form
    class="flex items-end gap-2 rounded-[28px] border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_40px_rgba(15,23,42,0.08)]"
    @submit.prevent="emit('submit')"
  >
    <textarea
      ref="fieldEl"
      v-virtual-keyboard
      :value="modelValue"
      rows="1"
      placeholder="질문"
      class="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"
      :disabled="disabled"
      @input="onInput"
      @keydown.enter.exact.prevent="emit('submit')"
    />
    <button
      class="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white disabled:opacity-30"
      type="submit"
      aria-label="보내기"
      :disabled="disabled || !modelValue.trim()"
    >
      <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 15V5M6 9l4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </form>
</template>
