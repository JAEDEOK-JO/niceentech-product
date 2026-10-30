<script setup>
import { isSheetNavKey } from '../sheet/sheetKeyboard'

defineProps({
  modelValue: { type: [String, Number], default: '' },
  editKey: { type: String, default: '' },
})

const emit = defineEmits(['open', 'navigate'])

const onKeydown = (event) => {
  if (!isSheetNavKey(event.key)) return
  event.preventDefault()
  emit('navigate', event.key)
}
</script>

<template>
  <button
    type="button"
    class="sheet-date"
    :data-edit-key="editKey"
    @click="emit('open')"
    @keydown="onKeydown"
  >
    {{ modelValue }}
  </button>
</template>

<style scoped>
.sheet-date {
  width: 100%;
  height: 22px;
  border: 0;
  background: transparent;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: inherit;
  cursor: pointer;
}
</style>
