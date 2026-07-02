<script setup lang="ts">
import type { CncItem } from '../types/cnc'
import { useCncCompleteToggle } from '../composables/useCncCompleteToggle'

const props = defineProps<{
  item: CncItem
  busy: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', payload: { id: number; isCompleted: boolean }): void
}>()

const {
  statusLabel,
  statusClass,
  handlePointerDown,
  handlePointerUp,
  handleClick,
} = useCncCompleteToggle(
  () => props.item,
  () => props.busy,
  (payload) => emit('toggle', payload),
)
</script>

<template>
  <button
    type="button"
    class="shrink-0 touch-manipulation rounded-full px-2.5 py-0.5 text-xs font-extrabold disabled:opacity-40"
    :class="statusClass"
    :disabled="busy"
    @click="handleClick"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointerleave="handlePointerUp"
    @pointercancel="handlePointerUp"
  >
    {{ statusLabel }}
  </button>
</template>
