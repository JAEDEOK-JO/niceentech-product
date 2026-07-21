<script setup lang="ts">
import type { AttendanceRequest } from '../types/attendance'
import { formatLeaveDaysCountLabel } from '../utils/attendanceLeaveType'
import AttendanceEvidenceThumb from './AttendanceEvidenceThumb.vue'

const props = defineProps<{
  items: AttendanceRequest[]
  mode: 'requests' | 'approval' | 'gyeongyu' | 'daepyo'
  isRootAdmin?: boolean
  canManage?: boolean
  leaveBadgeClass: (type: string) => string
  statusBadgeClass?: (status: string) => string
}>()

const emit = defineEmits<{
  (e: 'openDetail', item: AttendanceRequest): void
  (e: 'openEvidence', payload: { urls: string[]; index?: number }): void
  (e: 'approve', item: AttendanceRequest): void
  (e: 'reject', item: AttendanceRequest): void
  (e: 'gyeongyu', item: AttendanceRequest): void
  (e: 'daepyoApprove', item: AttendanceRequest): void
  (e: 'adminEdit', item: AttendanceRequest): void
  (e: 'adminDelete', item: AttendanceRequest): void
  (e: 'print', item: AttendanceRequest): void
}>()

function period(item: AttendanceRequest) {
  const s = item.startDate?.slice(0, 10) || '-'
  const e = item.endDate?.slice(0, 10) || '-'
  return s === e ? s : `${s} ~ ${e}`
}

function appliedAt(item: AttendanceRequest) {
  const raw = String(item.createdAt ?? '').trim()
  if (!raw) return '-'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '-'
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

type ActionKey = 'approve' | 'reject' | 'gyeongyu' | 'daepyoApprove' | 'adminEdit' | 'adminDelete' | 'print'

interface ActionDef {
  key: ActionKey
  label: string
  buttonClass: string
}

const BTN = {
  emerald: 'rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500',
  blue: 'rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500',
  purple: 'rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500',
  red: 'rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-400',
  outline: 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100',
  outlineRed: 'rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50',
}

function actionsFor(item: AttendanceRequest): ActionDef[] {
  if (props.mode === 'approval') {
    return [
      { key: 'approve', label: '승인', buttonClass: BTN.emerald },
      { key: 'reject', label: '반려', buttonClass: BTN.red },
    ]
  }
  if (props.mode === 'gyeongyu') {
    const actions: ActionDef[] = [{ key: 'gyeongyu', label: '경유', buttonClass: BTN.blue }]
    if (props.canManage) {
      actions.push(
        { key: 'adminEdit', label: '수정', buttonClass: BTN.outline },
        { key: 'adminDelete', label: '삭제', buttonClass: BTN.outlineRed },
      )
    }
    return actions
  }
  if (props.mode === 'daepyo') {
    const actions: ActionDef[] = [
      { key: 'daepyoApprove', label: '최종승인', buttonClass: BTN.purple },
      { key: 'reject', label: '반려', buttonClass: BTN.red },
    ]
    if (props.canManage) {
      actions.push(
        { key: 'adminEdit', label: '수정', buttonClass: BTN.outline },
        { key: 'adminDelete', label: '삭제', buttonClass: BTN.outlineRed },
      )
    }
    return actions
  }
  if (item.status !== '승인') {
    return [
      { key: 'adminEdit', label: '수정', buttonClass: BTN.outline },
      { key: 'adminDelete', label: '삭제', buttonClass: BTN.outlineRed },
    ]
  }
  const actions: ActionDef[] = [{ key: 'print', label: '인쇄', buttonClass: BTN.outline }]
  if (props.isRootAdmin) actions.push({ key: 'adminDelete', label: '삭제', buttonClass: BTN.outlineRed })
  return actions
}

function runAction(key: ActionKey, item: AttendanceRequest) {
  if (key === 'approve') emit('approve', item)
  else if (key === 'reject') emit('reject', item)
  else if (key === 'gyeongyu') emit('gyeongyu', item)
  else if (key === 'daepyoApprove') emit('daepyoApprove', item)
  else if (key === 'adminEdit') emit('adminEdit', item)
  else if (key === 'adminDelete') emit('adminDelete', item)
  else if (key === 'print') emit('print', item)
}
</script>

<template>
  <!-- ═══ 데스크톱: 테이블 ═══ -->
  <div class="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
    <table class="min-w-full border-collapse text-sm">
      <thead>
        <tr class="bg-slate-50 text-center text-xs font-bold text-slate-500">
          <th class="whitespace-nowrap border border-slate-200 px-4 py-3">신청일자</th>
          <th class="whitespace-nowrap border border-slate-200 px-4 py-3">신청자</th>
          <th class="whitespace-nowrap border border-slate-200 px-4 py-3">종류</th>
          <th class="whitespace-nowrap border border-slate-200 px-4 py-3">기간</th>
          <th class="border border-slate-200 px-4 py-3">사유</th>
          <th v-if="mode === 'requests'" class="whitespace-nowrap border border-slate-200 px-4 py-3">상태</th>
          <th class="whitespace-nowrap border border-slate-200 px-4 py-3">증빙</th>
          <th class="whitespace-nowrap border border-slate-200 px-4 py-3">처리</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in items"
          :key="item.id"
          class="cursor-pointer transition-colors hover:bg-slate-50"
          @click="emit('openDetail', item)"
        >
          <td class="whitespace-nowrap border border-slate-200 px-4 py-3 text-center text-xs font-medium text-slate-600">
            {{ appliedAt(item) }}
          </td>
          <td class="whitespace-nowrap border border-slate-200 px-4 py-3 text-center">
            <p class="font-extrabold text-slate-900">{{ item.userName }}</p>
            <p class="mt-0.5 text-xs text-slate-400">{{ item.department || '-' }}</p>
          </td>
          <td class="whitespace-nowrap border border-slate-200 px-4 py-3 text-center">
            <span class="rounded-full px-2.5 py-1 text-[11px] font-bold" :class="leaveBadgeClass(item.leaveType)">
              {{ item.leaveType }}
            </span>
          </td>
          <td class="whitespace-nowrap border border-slate-200 px-4 py-3 text-center">
            <p class="font-medium text-slate-700">{{ period(item) }}</p>
            <p class="mt-0.5 text-xs font-bold text-slate-500">
              {{ formatLeaveDaysCountLabel(item.leaveType, item.daysCount, item.reason) }}
            </p>
          </td>
          <td class="max-w-[240px] border border-slate-200 px-4 py-3 text-center">
            <p class="truncate text-slate-600" :title="item.reason">{{ item.reason || '-' }}</p>
            <p
              v-if="item.status === '반려' && item.rejectReason"
              class="mt-0.5 truncate text-xs font-bold text-red-500"
              :title="item.rejectReason"
            >
              반려: {{ item.rejectReason }}
            </p>
          </td>
          <td v-if="mode === 'requests'" class="whitespace-nowrap border border-slate-200 px-4 py-3 text-center">
            <span class="rounded-full px-2.5 py-1 text-[11px] font-bold" :class="statusBadgeClass?.(item.status)">
              {{ item.status }}
            </span>
          </td>
          <td class="border border-slate-200 px-4 py-3">
            <div class="flex justify-center" @click.stop>
              <AttendanceEvidenceThumb
                v-if="item.evidenceUrls?.length"
                :urls="item.evidenceUrls"
                @open="emit('openEvidence', { urls: item.evidenceUrls, index: $event })"
              />
              <span v-else class="text-xs text-slate-300">-</span>
            </div>
          </td>
          <td class="whitespace-nowrap border border-slate-200 px-4 py-3 text-center" @click.stop>
            <div class="inline-flex items-center gap-1.5">
              <button
                v-for="action in actionsFor(item)"
                :key="action.key"
                type="button"
                :class="action.buttonClass"
                @click="runAction(action.key, item)"
              >{{ action.label }}</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ═══ 모바일: 카드 ═══ -->
  <div class="space-y-3 md:hidden">
    <div
      v-for="item in items"
      :key="item.id"
      class="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
      @click="emit('openDetail', item)"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate text-sm font-extrabold text-slate-900">{{ item.userName }}</p>
          <p class="mt-0.5 text-xs text-slate-400">{{ item.department || '-' }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <span class="rounded-full px-2.5 py-1 text-[11px] font-bold" :class="leaveBadgeClass(item.leaveType)">
            {{ item.leaveType }}
          </span>
          <span
            v-if="mode === 'requests'"
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="statusBadgeClass?.(item.status)"
          >
            {{ item.status }}
          </span>
        </div>
      </div>

      <div class="mt-3 space-y-1 text-xs">
        <p class="font-medium text-slate-600">{{ appliedAt(item) }}</p>
        <p class="font-medium text-slate-700">
          {{ period(item) }}
          <span class="ml-1 font-bold text-slate-500">
            {{ formatLeaveDaysCountLabel(item.leaveType, item.daysCount, item.reason) }}
          </span>
        </p>
        <p v-if="item.reason" class="line-clamp-2 text-slate-600">{{ item.reason }}</p>
        <p v-if="item.status === '반려' && item.rejectReason" class="line-clamp-2 font-bold text-red-500">
          반려: {{ item.rejectReason }}
        </p>
      </div>

      <div class="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3" @click.stop>
        <AttendanceEvidenceThumb
          v-if="item.evidenceUrls?.length"
          :urls="item.evidenceUrls"
          @open="emit('openEvidence', { urls: item.evidenceUrls, index: $event })"
        />
        <span v-else class="text-xs text-slate-300">증빙 없음</span>
        <div class="flex items-center gap-1.5">
          <button
            v-for="action in actionsFor(item)"
            :key="action.key"
            type="button"
            :class="action.buttonClass"
            @click="runAction(action.key, item)"
          >{{ action.label }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
