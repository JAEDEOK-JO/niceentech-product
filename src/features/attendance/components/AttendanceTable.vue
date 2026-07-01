<script setup lang="ts">
import { computed } from 'vue'
import type { AttendanceRequest } from '../types/attendance'
import { getFinalApproverDisplayName } from '../utils/attendanceApprover'

const props = defineProps<{
  items: AttendanceRequest[]
  currentUserId: string
  isAdmin: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', item: AttendanceRequest): void
  (e: 'delete', item: AttendanceRequest): void
  (e: 'approve', item: AttendanceRequest): void
  (e: 'reject', item: AttendanceRequest): void
}>()

const statusClass = (status: string) => {
  if (status === '승인') return 'bg-emerald-100 text-emerald-700'
  if (status === '반려') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

const leaveTypeClass = (type: string) => {
  if (type.startsWith('반차')) return 'bg-blue-100 text-blue-700'
  if (type === '병가') return 'bg-purple-100 text-purple-700'
  if (type === '연차') return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-600'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-100 bg-slate-50">
          <th v-if="isAdmin" class="whitespace-nowrap px-4 py-3 text-left font-bold text-slate-600">
            이름(부서)
          </th>
          <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-slate-600">종류</th>
          <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-slate-600">기간</th>
          <th class="whitespace-nowrap px-4 py-3 text-center font-bold text-slate-600">일수</th>
          <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-slate-600">사유</th>
          <th class="whitespace-nowrap px-4 py-3 text-center font-bold text-slate-600">상태</th>
          <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-slate-600">신청일</th>
          <th class="whitespace-nowrap px-4 py-3 text-center font-bold text-slate-600">액션</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="items.length === 0">
          <td
            :colspan="isAdmin ? 8 : 7"
            class="py-12 text-center text-sm text-slate-400"
          >
            신청 내역이 없습니다.
          </td>
        </tr>
        <tr
          v-for="item in items"
          :key="item.id"
          class="border-b border-slate-100 last:border-0 hover:bg-slate-50"
        >
          <!-- 이름(부서) - 관리자만 -->
          <td v-if="isAdmin" class="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
            {{ item.userName }}
            <span class="ml-1 text-xs text-slate-400">({{ item.department || '-' }})</span>
          </td>

          <!-- 종류 -->
          <td class="whitespace-nowrap px-4 py-3">
            <span
              class="rounded-full px-2.5 py-1 text-xs font-bold"
              :class="leaveTypeClass(item.leaveType)"
            >
              {{ item.leaveType }}
            </span>
          </td>

          <!-- 기간 -->
          <td class="whitespace-nowrap px-4 py-3 text-slate-700">
            {{ formatDate(item.startDate) }}
            <template v-if="item.startDate !== item.endDate">
              ~ {{ formatDate(item.endDate) }}
            </template>
          </td>

          <!-- 일수 -->
          <td class="whitespace-nowrap px-4 py-3 text-center font-bold text-slate-800">
            {{ item.daysCount }}일
          </td>

          <!-- 사유 -->
          <td class="max-w-[200px] truncate px-4 py-3 text-slate-600" :title="item.reason">
            {{ item.reason || '-' }}
          </td>

          <!-- 상태 -->
          <td class="whitespace-nowrap px-4 py-3 text-center">
            <span
              class="rounded-full px-2.5 py-1 text-xs font-bold"
              :class="statusClass(item.status)"
            >
              {{ item.status }}
            </span>
            <div v-if="item.status === '반려' && item.rejectReason" class="mt-1 text-xs text-red-500">
              {{ item.rejectReason }}
            </div>
            <div v-if="getFinalApproverDisplayName(item)" class="mt-1 text-xs text-slate-400">
              {{ getFinalApproverDisplayName(item) }}
            </div>
          </td>

          <!-- 신청일 -->
          <td class="whitespace-nowrap px-4 py-3 text-slate-500">
            {{ formatDate(item.createdAt) }}
          </td>

          <!-- 액션 -->
          <td class="whitespace-nowrap px-4 py-3 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <!-- 본인 + 대기중: 수정/삭제 -->
              <template v-if="item.userId === currentUserId && item.status === '대기중'">
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  @click="emit('edit', item)"
                >
                  수정
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-500 hover:bg-red-50"
                  @click="emit('delete', item)"
                >
                  취소
                </button>
              </template>

              <!-- 관리자: 대기중 승인/반려 -->
              <template v-if="isAdmin && item.status === '대기중'">
                <button
                  type="button"
                  class="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                  @click="emit('approve', item)"
                >
                  승인
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-400"
                  @click="emit('reject', item)"
                >
                  반려
                </button>
              </template>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
