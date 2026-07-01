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

const cellClass = 'border border-slate-300 px-3 py-2.5 text-sm'
const headClass = 'border border-slate-300 bg-slate-50 px-3 py-2.5 text-center text-xs font-extrabold text-slate-600'
const completedRowClass = 'bg-sky-50/60'

const displayText = (value: string) => String(value ?? '').trim()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-slate-300 bg-white">
    <div v-if="loading" class="px-4 py-10 text-center text-sm font-bold text-slate-500">
      불러오는 중...
    </div>
    <div v-else-if="items.length === 0" class="px-4 py-10 text-center text-sm font-bold text-slate-500">
      등록된 항목이 없습니다.
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr>
            <th :class="headClass">등록일</th>
            <th :class="headClass">완료일</th>
            <th :class="headClass">회사명</th>
            <th :class="headClass">현장명</th>
            <th :class="headClass">구역명</th>
            <th :class="headClass">도번</th>
            <th :class="headClass">종류</th>
            <th :class="headClass">길이</th>
            <th :class="headClass">수량</th>
            <th :class="headClass">완료여부</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            :class="item.isCompleted ? completedRowClass : ''"
          >
            <td :class="[cellClass, 'text-center text-slate-600']">{{ formatCncShortDate(item.createdAt) }}</td>
            <td :class="[cellClass, 'text-center text-red-600']">{{ formatCncShortDate(item.completedAt) }}</td>
            <td :class="[cellClass, 'text-center font-bold text-slate-900']">{{ displayText(item.company) }}</td>
            <td :class="[cellClass, 'text-center text-slate-700']">{{ displayText(item.place) }}</td>
            <td :class="[cellClass, 'text-center text-slate-700']">
              <button
                v-if="canManage"
                type="button"
                class="w-full font-semibold text-slate-700"
                @click="emit('edit-area', item)"
              >
                {{ displayText(item.area) }}
              </button>
              <span v-else>{{ displayText(item.area) }}</span>
            </td>
            <td :class="[cellClass, 'text-center text-slate-700']">{{ displayText(item.drawingNo) }}</td>
            <td :class="[cellClass, 'text-center font-bold text-slate-900']">{{ displayText(item.kind) }}</td>
            <td :class="[cellClass, 'text-center font-extrabold text-slate-900']">
              {{ item.length > 0 ? item.length.toLocaleString() : '' }}
            </td>
            <td :class="[cellClass, 'text-center font-extrabold text-slate-900']">
              {{ item.quantity > 0 ? item.quantity.toLocaleString() : '' }}
            </td>
            <td :class="[cellClass, 'text-center']">
              <CncCompleteStatusButton
                :item="item"
                :busy="updatingId === item.id"
                @toggle="emit('toggle-completed', $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
