<script setup>
import { isSheetNavKey } from '../sheet/sheetKeyboard'

defineProps({
  modelValue: { type: [String, Number], default: '' },
  inputType: { type: String, default: 'text' },
  editKey: { type: String, default: '' },
  textClass: { type: String, default: '' },
})

const emit = defineEmits(['start', 'update:modelValue', 'commit', 'cancel', 'navigate'])

const onKeydown = (event) => {
  if (event.key === 'Enter') {
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
</script>

<template>
  <input
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

.sheet-input[type='number'] {
  -moz-appearance: textfield;
}

.sheet-input[type='number']::-webkit-inner-spin-button,
.sheet-input[type='number']::-webkit-outer-spin-button {
  margin: 0;
  -webkit-appearance: none;
}
</style>
