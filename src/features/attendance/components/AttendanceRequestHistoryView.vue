<script setup lang="ts">
import type { AttendanceRequest } from '../types/attendance'
import { getFinalApproverDisplayName, isDeptHeadApproved } from '../utils/attendanceApprover'
import { formatLeaveDaysCountLabel } from '../utils/attendanceLeaveType'

defineProps<{
  userName: string
  department: string
  items: AttendanceRequest[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'openDetail', item: AttendanceRequest): void
}>()

const statusBorder = (status: string) => {
  if (status === '승인') return 'border-l-emerald-500'
  if (status === '반려') return 'border-l-red-400'
  if (status === '최종대기' || status === '부서장승인') return 'border-l-purple-400'
  if (status === '경유대기') return 'border-l-blue-400'
  return 'border-l-amber-400'
}

const statusBadge = (status: string) => {
  if (status === '승인') return 'bg-emerald-100 text-emerald-700'
  if (status === '반려') return 'bg-red-100 text-red-600'
  if (status === '최종대기' || status === '부서장승인') return 'bg-purple-100 text-purple-700'
  if (status === '경유대기') return 'bg-blue-100 text-blue-700'
  return 'bg-amber-100 text-amber-700'
}

const leaveTypeBadge = (type: string) => {
  if (type.startsWith('반차')) return 'bg-blue-100 text-blue-700'
  if (type === '병가') return 'bg-purple-100 text-purple-700'
  if (type === '연차') return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-500'
}

const formatDate = (d: string) => (d ? d.slice(0, 10) : '-')

const formatPeriod = (item: AttendanceRequest) =>
  item.startDate === item.endDate
    ? formatDate(item.startDate)
    : `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <div class="w-full px-[5px] pb-8 pt-[15px] sm:px-5">
      <div class="mb-5 flex items-center gap-3">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          @click="emit('back')"
        >
          ← 뒤로
        </button>
        <div>
          <h1 class="text-lg font-extrabold text-slate-900">신청 현황</h1>
          <p class="text-xs text-slate-500">{{ department }} · {{ userName }}</p>
        </div>
      </div>

      <div v-if="loading" class="py-20 text-center">
        <div class="inline-block h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
      </div>

      <div
        v-else-if="items.length === 0"
        class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400"
      >
        신청 내역이 없습니다.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="item in items"
          :key="item.id"
          class="cursor-pointer rounded-xl border border-l-4 border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
          :class="statusBorder(item.status)"
          @click="emit('openDetail', item)"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="leaveTypeBadge(item.leaveType)">
                {{ item.leaveType }}
              </span>
              <span class="text-xs font-bold text-slate-700">{{ formatLeaveDaysCountLabel(item.leaveType, item.daysCount) }}</span>
              <span class="text-xs text-slate-400">{{ formatPeriod(item) }}</span>
            </div>
            <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="statusBadge(item.status)">
              {{ item.status }}
            </span>
          </div>
          <div class="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span v-if="getFinalApproverDisplayName(item)" class="text-slate-400">
              승인: {{ getFinalApproverDisplayName(item) }}
            </span>
            <span v-else-if="isDeptHeadApproved(item) && item.approvedBy" class="text-slate-400">
              부서장: {{ item.approvedBy }}
            </span>
            <span v-else-if="item.status === '반려' && item.rejectReason" class="text-red-500">
              반려: {{ item.rejectReason }}
            </span>
            <span class="truncate">{{ item.reason || '-' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
