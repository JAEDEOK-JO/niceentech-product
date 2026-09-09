<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { isSheetNavKey } from '../sheet/sheetKeyboard'
import { fitSheetMemoHeight } from '../sheet/fitSheetMemoHeight'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  inputType: { type: String, default: 'text' },
  editKey: { type: String, default: '' },
  textClass: { type: String, default: '' },
  multiline: { type: Boolean, default: false },
})

const emit = defineEmits(['start', 'update:modelValue', 'commit', 'cancel', 'navigate'])

const fieldEl = ref(null)
let memoObserver = null

const fitMemo = () => {
  if (!props.multiline) return
  nextTick(() => fitSheetMemoHeight(fieldEl.value))
}

const onKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    emit('commit')
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
    return
  }
  if (!isSheetNavKey(event.key)) return
  event.preventDefault()
  emit('navigate', event.key)
}

const onMemoInput = (event) => {
  emit('update:modelValue', event.target.value)
  fitMemo()
}

onMounted(() => {
  fitMemo()
  if (!props.multiline || typeof ResizeObserver === 'undefined') return
  let lastWidth = 0
  memoObserver = new ResizeObserver((entries) => {
    const width = Math.round(entries[0]?.contentRect?.width ?? 0)
    if (width === lastWidth) return
    lastWidth = width
    fitMemo()
  })
  nextTick(() => {
    const target = fieldEl.value?.parentElement
    if (target) memoObserver.observe(target)
  })
})

onBeforeUnmount(() => {
  memoObserver?.disconnect()
})

watch(() => props.modelValue, fitMemo)
</script>

<template>
  <textarea
    v-if="multiline"
    ref="fieldEl"
    :value="modelValue"
    :data-edit-key="editKey"
    rows="1"
    class="sheet-input sheet-input-memo"
    :class="textClass"
    @focus="emit('start')"
    @input="onMemoInput"
    @keydown="onKeydown"
    @blur="emit('commit')"
  />
  <input
    v-else
    :value="modelValue"
    :data-edit-key="editKey"
    :type="inputType"
    :step="inputType === 'number' ? '0.01' : undefined"
    :inputmode="inputType === 'number' ? 'decimal' : undefined"
    class="sheet-input"
    :class="textClass"
    @focus="emit('start')"
    @input="emit('update:modelValue', $event.target.value)"
    @keydown="onKeydown"
    @blur="emit('commit')"
  />
</template>

<style scoped>
.sheet-input {
  width: 100%;
  height: 22px;
  border: 0;
  background: transparent;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
  color: inherit;
  outline: none;
}

.sheet-input-memo {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: auto;
  min-height: 22px;
  padding: 0;
  line-height: 1.35;
  text-align: center;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  overflow-x: hidden;
  overflow-y: hidden;
  resize: none;
}

.sheet-input[type='number'] {
  -moz-appearance: textfield;
}

.sheet-input[type='number']::-webkit-inner-spin-button,
.sheet-input[type='number']::-webkit-outer-spin-button {
  margin: 0;
  -webkit-appearance: none;
}
</style>
