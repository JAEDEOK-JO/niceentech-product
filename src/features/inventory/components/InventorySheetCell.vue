<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import OverflowHover from '@/components/ui/OverflowHover.vue'
import { isSheetNavKey } from '../sheet/sheetKeyboard'
import { fitSheetMemoHeight } from '../sheet/fitSheetMemoHeight'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  inputType: { type: String, default: 'text' },
  editKey: { type: String, default: '' },
  textClass: { type: String, default: '' },
  multiline: { type: Boolean, default: false },
  clamp: { type: Boolean, default: false },
})

const emit = defineEmits(['start', 'update:modelValue', 'commit', 'cancel', 'navigate'])

const fieldEl = ref(null)
const editing = ref(false)
let memoObserver = null
const usesPreview = computed(() => (props.multiline || props.clamp) && !editing.value)
const previewText = computed(() => String(props.modelValue ?? ''))

const fitMemo = () => {
  if (!props.multiline || !editing.value) return
  nextTick(() => fitSheetMemoHeight(fieldEl.value, 8))
}

const beginEdit = () => {
  if (editing.value || (!props.multiline && !props.clamp)) return
  editing.value = true
  emit('start')
  nextTick(() => {
    fieldEl.value?.focus()
    fitMemo()
  })
}

const finishEdit = () => {
  editing.value = false
  emit('commit')
}

const onKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (props.multiline || props.clamp) {
      event.currentTarget.blur()
      return
    }
    emit('commit')
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
    if (props.multiline || props.clamp) event.currentTarget.blur()
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

const watchMemoWidth = () => {
  memoObserver?.disconnect()
  memoObserver = null
  if (!props.multiline || !editing.value || typeof ResizeObserver === 'undefined') return
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
}

onMounted(watchMemoWidth)
watch(editing, watchMemoWidth)

onBeforeUnmount(() => {
  memoObserver?.disconnect()
})

watch(() => props.modelValue, fitMemo)
</script>

<template>
  <OverflowHover v-if="usesPreview" :text="previewText">
    <button
      type="button"
      :data-edit-key="editKey"
      class="sheet-memo-hit"
      @focus="beginEdit"
      @click="beginEdit"
    >
      <span class="sheet-memo-preview" :class="[textClass, { 'is-single': !multiline }]">{{ previewText }}</span>
    </button>
  </OverflowHover>
  <textarea
    v-else-if="multiline"
    ref="fieldEl"
    :value="modelValue"
    :data-edit-key="editKey"
    rows="1"
    class="sheet-input sheet-input-memo"
    :class="textClass"
    @input="onMemoInput"
    @keydown="onKeydown"
    @blur="finishEdit"
  />
  <input
    v-else
    ref="fieldEl"
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
    @blur="finishEdit"
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

.sheet-memo-hit {
  display: block;
  width: 100%;
  min-height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: text;
}

.sheet-memo-preview {
  display: -webkit-box;
  box-sizing: border-box;
  width: 100%;
  min-height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  text-align: center;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  overflow: hidden;
  cursor: text;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.sheet-memo-preview.is-single {
  display: block;
  white-space: nowrap;
  text-overflow: ellipsis;
  word-break: normal;
  overflow-wrap: normal;
  -webkit-line-clamp: unset;
  line-clamp: unset;
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
