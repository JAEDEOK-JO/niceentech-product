<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { AttendanceRequest } from '../types/attendance'
import { fetchEmployeeAttendanceRequests } from '../services/attendance.service'
import { getAttendanceStatusLabel, getFinalApproverDisplayName, isDeptHeadApproved } from '../utils/attendanceApprover'
import { formatLeaveDaysCountLabel } from '../utils/attendanceLeaveType'

const props = defineProps<{
  userName: string
  department: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const items = ref<AttendanceRequest[]>([])
const loading = ref(true)
const loadFailed = ref(false)

onMounted(async () => {
  try {
    items.value = await fetchEmployeeAttendanceRequests(props.userName, props.department)
  } catch {
    loadFailed.value = true
    items.value = []
  } finally {
    loading.value = false
  }
})

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
  if (type === '귀국휴가') return 'bg-indigo-100 text-indigo-700'
  return 'bg-slate-100 text-slate-500'
}

const formatDate = (d: string) => (d ? d.slice(0, 10) : '-')

const formatPeriod = (item: AttendanceRequest) =>
  item.startDate === item.endDate
    ? formatDate(item.startDate)
    : `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`
</script>

<template>
  <Teleport to="body">
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4"
    @click.self="emit('close')"
  >
    <div class="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-2xl">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-extrabold text-slate-900">신청현황</h2>
          <p class="mt-0.5 text-xs text-slate-500">{{ department }} · {{ userName }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          @click="emit('close')"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div v-if="loading" class="py-16 text-center">
          <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
        </div>

        <p v-else-if="loadFailed" class="py-14 text-center text-sm font-bold text-red-500">
          불러오지 못했습니다.
        </p>

        <p
          v-else-if="items.length === 0"
          class="rounded-xl border border-dashed border-slate-200 py-14 text-center text-sm text-slate-400"
        >
          신청 내역이 없습니다.
        </p>

        <div v-else class="space-y-2">
          <div
            v-for="item in items"
            :key="item.id"
            class="rounded-xl border border-l-4 border-slate-200 bg-white px-4 py-3"
            :class="statusBorder(item.status)"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="leaveTypeBadge(item.leaveType)">
                  {{ item.leaveType }}
                </span>
                <span class="text-xs font-bold text-slate-700">
                  {{ formatLeaveDaysCountLabel(item.leaveType, item.daysCount, item.reason) }}
                </span>
                <span class="text-xs text-slate-400">{{ formatPeriod(item) }}</span>
              </div>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="statusBadge(item.status)">
                {{ getAttendanceStatusLabel(item.status) }}
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
  </div>
  </Teleport>
</template>
