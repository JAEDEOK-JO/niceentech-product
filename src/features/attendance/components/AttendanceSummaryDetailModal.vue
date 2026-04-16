<script setup lang="ts">
import type { AttendanceRequest } from '../types/attendance'

const props = defineProps<{
  visible: boolean
  userName: string
  department: string
  requests: AttendanceRequest[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', item: AttendanceRequest): void
}>()

const formatDate = (value: string) => (value ? value.slice(0, 10) : '-')
const formatPeriod = (item: AttendanceRequest) =>
  item.startDate === item.endDate ? formatDate(item.startDate) : `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`

const leaveTypeBadge = (type: string) => {
  if (type.startsWith('반차')) return 'bg-blue-100 text-blue-700'
  if (type === '병가') return 'bg-purple-100 text-purple-700'
  if (type === '연차') return 'bg-slate-100 text-slate-700'
  return 'bg-orange-100 text-orange-700'
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 class="text-lg font-extrabold text-slate-900">{{ userName }}</h2>
          <p class="mt-1 text-sm text-slate-400">{{ department || '부서 미지정' }} · 사용 내역 {{ requests.length }}건</p>
        </div>
        <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100" @click="emit('close')">닫기</button>
      </div>

      <div class="max-h-[70vh] overflow-y-auto p-5">
        <div v-if="requests.length === 0" class="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          선택한 직원의 사용 내역이 없습니다.
        </div>
        <div v-else class="space-y-3">
          <button
            v-for="item in requests"
            :key="item.id"
            type="button"
            class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
            @click="emit('select', item)"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="leaveTypeBadge(item.leaveType)">
                  {{ item.leaveType }}
                </span>
                <span class="text-sm font-bold text-slate-900">{{ formatPeriod(item) }}</span>
                <span class="text-sm text-slate-500">{{ item.daysCount }}일</span>
              </div>
              <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">{{ item.status }}</span>
            </div>
            <p v-if="item.reason" class="mt-2 truncate text-sm text-slate-500">{{ item.reason }}</p>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
