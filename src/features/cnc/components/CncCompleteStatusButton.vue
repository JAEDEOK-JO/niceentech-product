<script setup lang="ts">
import type { CncItem } from '../types/cnc'

const props = defineProps<{
  item: CncItem
  busy: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', payload: { id: number; isCompleted: boolean }): void
}>()

const LONG_PRESS_MS = 700
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let longPressTriggered = false

const clearLongPressTimer = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const handlePointerDown = () => {
  if (props.busy || !props.item.isCompleted) return

  longPressTriggered = false
  clearLongPressTimer()
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    longPressTriggered = true
    emit('toggle', { id: props.item.id, isCompleted: false })
  }, LONG_PRESS_MS)
}

const handlePointerUp = () => {
  clearLongPressTimer()
}

const handleClick = () => {
  if (longPressTriggered) {
    longPressTriggered = false
    return
  }
  if (props.busy || props.item.isCompleted) return
  emit('toggle', { id: props.item.id, isCompleted: true })
}
</script>

<template>
  <button
    type="button"
    class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold disabled:opacity-40"
    :class="item.isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
    :disabled="busy"
    @click="handleClick"
    @mousedown="handlePointerDown"
    @mouseup="handlePointerUp"
    @mouseleave="handlePointerUp"
    @touchstart.passive="handlePointerDown"
    @touchend="handlePointerUp"
    @touchcancel="handlePointerUp"
  >
    {{ busy ? '변경 중...' : item.isCompleted ? '완료' : '미완료' }}
  </button>
</template>
