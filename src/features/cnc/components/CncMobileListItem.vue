<script setup lang="ts">
import type { CncItem } from '../types/cnc'
import CncMobileCompleteHeader from './CncMobileCompleteHeader.vue'
import { useCncCompleteToggle } from '../composables/useCncCompleteToggle'

const props = defineProps<{
  item: CncItem
  busy: boolean
  canManage: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-completed', payload: { id: number; isCompleted: boolean }): void
  (e: 'edit-area', item: CncItem): void
}>()

const completedRowClass = 'bg-sky-50/60'
const displayText = (value: string) => String(value ?? '').trim()

const {
  statusLabel,
  statusClass,
  handlePointerDown,
  handlePointerUp,
  handleClick,
} = useCncCompleteToggle(
  () => props.item,
  () => props.busy,
  (payload) => emit('toggle-completed', payload),
)
</script>

<template>
  <li
    class="touch-manipulation border-b border-slate-200 px-4 py-3.5 text-left disabled:opacity-40"
    :class="item.isCompleted ? completedRowClass : 'bg-white'"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointerleave="handlePointerUp"
    @pointercancel="handlePointerUp"
  >
    <CncMobileCompleteHeader
      :item="item"
      :busy="busy"
      :status-label="statusLabel"
      :status-class="statusClass"
    />

    <p class="mt-2 truncate text-sm leading-snug text-slate-900">
      <span class="font-extrabold">{{ displayText(item.company) }}</span>
      <template v-if="displayText(item.place)">
        <span class="mx-1 text-slate-400">·</span>
        <span class="font-semibold text-slate-700">{{ displayText(item.place) }}</span>
      </template>
    </p>

    <p
      v-if="displayText(item.drawingNo) || displayText(item.area)"
      class="mt-1.5 truncate text-xs leading-snug text-slate-700"
    >
      <template v-if="displayText(item.drawingNo)">
        <span>{{ displayText(item.drawingNo) }}</span>
      </template>
      <template v-if="displayText(item.drawingNo) && displayText(item.area)">
        <span class="mx-1.5 text-slate-300">|</span>
      </template>
      <template v-if="displayText(item.area)">
        <button
          v-if="canManage"
          type="button"
          class="font-semibold text-slate-800"
          @click.stop="emit('edit-area', item)"
          @pointerdown.stop
          @pointerup.stop
        >
          {{ displayText(item.area) }}
        </button>
        <span v-else>{{ displayText(item.area) }}</span>
      </template>
    </p>

    <p class="mt-1.5 text-xs leading-snug text-slate-700">
      <template v-if="displayText(item.kind)">
        <span class="font-bold text-slate-500">종류</span>
        <span class="ml-1 font-bold text-slate-900">{{ displayText(item.kind) }}</span>
      </template>
      <template v-if="displayText(item.kind) && item.length > 0">
        <span class="mx-1.5 text-slate-300">|</span>
      </template>
      <template v-if="item.length > 0">
        <span class="font-bold text-slate-500">길이</span>
        <span class="ml-1 font-extrabold text-slate-900">{{ item.length.toLocaleString() }}</span>
      </template>
      <template v-if="(displayText(item.kind) || item.length > 0) && item.quantity > 0">
        <span class="mx-1.5 text-slate-300">|</span>
      </template>
      <template v-if="item.quantity > 0">
        <span class="font-bold text-slate-500">수량</span>
        <span class="ml-1 font-extrabold text-slate-900">{{ item.quantity.toLocaleString() }}</span>
      </template>
    </p>
  </li>
</template>
