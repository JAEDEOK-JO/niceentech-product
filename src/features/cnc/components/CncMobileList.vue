<script setup lang="ts">
import type { CncItem } from '../types/cnc'
import { formatCncShortDate } from '../utils/cncDate'
import CncCompleteStatusButton from './CncCompleteStatusButton.vue'

defineProps<{
  items: CncItem[]
  loading: boolean
  updatingId: number | null
  canManage: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-completed', payload: { id: number; isCompleted: boolean }): void
  (e: 'edit-area', item: CncItem): void
}>()

const completedRowClass = 'bg-sky-50/60'
const displayText = (value: string) => String(value ?? '').trim()
</script>

<template>
  <div v-if="loading" class="border-t border-slate-200 py-12 text-center text-sm font-bold text-slate-500">
    불러오는 중...
  </div>
  <div v-else-if="items.length === 0" class="border-t border-slate-200 py-12 text-center text-sm font-bold text-slate-500">
    등록된 항목이 없습니다.
  </div>
  <ul v-else class="border-t border-slate-200">
    <li
      v-for="item in items"
      :key="item.id"
      class="border-b border-slate-200 px-4 py-3.5"
      :class="item.isCompleted ? completedRowClass : 'bg-white'"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold">
          <span v-if="formatCncShortDate(item.createdAt)" class="text-slate-500">
            등록일
            <span class="ml-1 text-slate-700">{{ formatCncShortDate(item.createdAt) }}</span>
          </span>
          <span v-if="formatCncShortDate(item.completedAt)" class="text-slate-500">
            완료일
            <span class="ml-1 text-red-600">{{ formatCncShortDate(item.completedAt) }}</span>
          </span>
        </div>
        <CncCompleteStatusButton
          :item="item"
          :busy="updatingId === item.id"
          @toggle="emit('toggle-completed', $event)"
        />
      </div>

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
            @click="emit('edit-area', item)"
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
  </ul>
</template>
