<script setup>
import { ref, watch } from 'vue'
import { joinInitials, splitInitials } from './initial-badges'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const tokens = ref(splitInitials(props.modelValue))
const draft = ref('')
const inputRef = ref(null)

watch(
  () => props.modelValue,
  (value) => {
    const next = joinInitials(splitInitials(value))
    if (next === joinInitials(tokens.value)) return
    tokens.value = splitInitials(value)
  },
)

watch(draft, (value) => {
  if (!/[,，]/.test(value)) return
  const parts = String(value).split(/[,，]/)
  const pending = parts.pop() ?? ''
  const next = parts.map((part) => part.trim()).filter(Boolean)
  draft.value = pending
  if (next.length === 0) return
  tokens.value = [...tokens.value, ...next]
  publish()
})

function publish() {
  emit('update:modelValue', joinInitials(tokens.value))
}

function commitDraft() {
  const next = splitInitials(draft.value)
  if (next.length === 0) return
  tokens.value = [...tokens.value, ...next]
  draft.value = ''
  publish()
}

function removeToken(index) {
  tokens.value = tokens.value.filter((_, tokenIndex) => tokenIndex !== index)
  publish()
}

function onKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitDraft()
    return
  }
  if (event.key === 'Backspace' && draft.value === '' && tokens.value.length > 0) {
    event.preventDefault()
    tokens.value = tokens.value.slice(0, -1)
    publish()
  }
}

function focusInput() {
  inputRef.value?.focus()
}
</script>

<template>
  <div
    class="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2 py-1.5"
    @click="focusInput"
  >
    <span
      v-for="(token, index) in tokens"
      :key="`${token}-${index}`"
      class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-extrabold text-blue-700"
    >
      {{ token }}
      <button
        type="button"
        class="text-sm leading-none text-blue-400"
        aria-label="삭제"
        @click.stop="removeToken(index)"
      >
        ×
      </button>
    </span>
    <input
      ref="inputRef"
      v-model="draft"
      type="text"
      class="min-w-[4.5rem] flex-1 border-0 bg-transparent px-1 text-sm text-slate-700 outline-none"
      @keydown="onKeydown"
      @blur="commitDraft"
    />
  </div>
</template>
