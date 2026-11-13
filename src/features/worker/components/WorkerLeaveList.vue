<script setup lang="ts">
import type { AttendanceRequest } from '@/features/attendance/types/attendance'
import { getAttendanceStatusLabel, getFinalApproverDisplayName, isDeptHeadApproved } from '@/features/attendance/utils/attendanceApprover'
import { formatLeaveDaysCountLabel } from '@/features/attendance/utils/attendanceLeaveType'

defineProps<{
  items: AttendanceRequest[]
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

const formatDate = (value: string) => (value ? value.slice(0, 10) : '-')

const formatPeriod = (item: AttendanceRequest) =>
  item.startDate === item.endDate
    ? formatDate(item.startDate)
    : `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="item in items"
      :key="item.id"
      class="rounded-xl border border-l-4 border-slate-200 bg-white px-4 py-3"
      :class="statusBorder(item.status)"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-sm font-extrabold text-slate-900">{{ item.leaveType }}</p>
          <p class="mt-0.5 text-xs font-bold text-slate-500">
            {{ formatLeaveDaysCountLabel(item.leaveType, item.daysCount, item.reason) }}
            · {{ formatPeriod(item) }}
          </p>
        </div>
        <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" :class="statusBadge(item.status)">
          {{ getAttendanceStatusLabel(item.status) }}
        </span>
      </div>
      <p v-if="getFinalApproverDisplayName(item)" class="mt-1.5 text-xs text-slate-400">
        승인: {{ getFinalApproverDisplayName(item) }}
      </p>
      <p v-else-if="isDeptHeadApproved(item) && item.approvedBy" class="mt-1.5 text-xs text-slate-400">
        부서장: {{ item.approvedBy }}
      </p>
      <p v-else-if="item.status === '반려' && item.rejectReason" class="mt-1.5 text-xs font-bold text-red-500">
        반려: {{ item.rejectReason }}
      </p>
    </div>
  </div>
</template>
