<script setup lang="ts">
import { computed } from 'vue'
import approvalStampUrl from '../approval-stamp.svg?url'
import gyeongyuStampUrl from '../gyeongyu-stamp.svg?url'
import niceentechLogoUrl from '../assets/niceentech-logo.png?url'
import type { AttendanceRequest, Employee } from '../types/attendance'
import { formatAttendanceReasonText } from '../utils/attendanceReason'
import {
  ATTENDANCE_WORKFLOW_STATUS,
  isDeptHeadApproved,
  isFinalApprovalPending,
  isGyeongyuPending,
} from '../utils/attendanceApprover'
import { formatLeaveDaysCountLabel } from '../utils/attendanceLeaveType'

const GYEONGYU_DISPLAY_NAME = '이지형'
const BUSEOJANG_PROFILE_NAME = 'duko777@niceentech.kr'
const BUSEOJANG_DISPLAY_NAME = '조재덕'
const DAEPYO_PROFILE_NAME = '__daepyo__'
const DAEPYO_DISPLAY_NAME = '이용필'

const DEPARTMENT_MANAGER_BY_DEPARTMENT: Record<string, string> = {
  용접부: '민뚜라',
  나사부: '압둘라',
  CNC: '소히돌',
  CNC부: '소히돌',
  지게차: '최용식',
}
const PRODUCTION_MANAGER_BY_ASSIGNED_DEPARTMENT: Record<string, string> = {
  가지관: '쩌민튼',
  메인관: '김성환',
}

const props = withDefaults(defineProps<{
  item: AttendanceRequest
  employees: Employee[]
  printMode?: boolean
}>(), {
  printMode: false,
})

const requestEmployee = computed(() =>
  props.employees.find(
    (employee) =>
      employee.name === props.item.userName &&
      employee.department === props.item.department,
  ) ?? null,
)

const managerDisplayName = computed(() => {
  const department = props.item.department
  if (department === '생산부') {
    const assignedDepartment = requestEmployee.value?.assignedDepartment ?? ''
    return PRODUCTION_MANAGER_BY_ASSIGNED_DEPARTMENT[assignedDepartment] ?? '쩌민튼'
  }
  return DEPARTMENT_MANAGER_BY_DEPARTMENT[department] ?? '쩌민튼'
})

const approvalSigners = computed(() => [
  { role: '담당', profileName: managerDisplayName.value, displayName: managerDisplayName.value },
  { role: '부서장', profileName: BUSEOJANG_PROFILE_NAME, displayName: BUSEOJANG_DISPLAY_NAME },
  { role: '대표이사', profileName: DAEPYO_PROFILE_NAME, displayName: DAEPYO_DISPLAY_NAME },
] as const)

const isApproved = computed(() => props.item.status === ATTENDANCE_WORKFLOW_STATUS.APPROVED)
const isBuseojanApproved = computed(() => isDeptHeadApproved(props.item))

const shouldShowSignature = (name: string) => {
  if (!name) return false
  if (name === managerDisplayName.value) return true
  if (name === BUSEOJANG_PROFILE_NAME) return isBuseojanApproved.value
  if (name === DAEPYO_PROFILE_NAME) return isApproved.value && !!props.item.daepyoBy
  return false
}

const fmt = (d: string) => (d ? d.slice(0, 10) : '-')
const formatSignerDate = (value: string | null) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!matched) return raw
  const [, year, month, day] = matched
  return `${year.slice(2)}.${month}.${day}`
}
const getSignerDate = (profileName: string) => {
  if (profileName === managerDisplayName.value) return formatSignerDate(props.item.createdAt)
  if (profileName === BUSEOJANG_PROFILE_NAME && isBuseojanApproved.value) return formatSignerDate(props.item.approvedAt)
  if (profileName === DAEPYO_PROFILE_NAME && isApproved.value) return formatSignerDate(props.item.daepyoAt)
  return ''
}

const period = computed(() => {
  const s = fmt(props.item.startDate)
  const e = fmt(props.item.endDate)
  return s === e ? s : `${s} ~ ${e}`
})

const reasonText = computed(() =>
  formatAttendanceReasonText({
    leaveType: props.item.leaveType,
    daysCount: props.item.daysCount,
    reason: props.item.reason,
  }),
)

const formatApplicationDate = (value: string) => {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

const applicationDate = computed(() => formatApplicationDate(props.item.createdAt))

const statusClass = computed(() => {
  if (props.item.status === ATTENDANCE_WORKFLOW_STATUS.APPROVED) return 'text-emerald-600 border-emerald-400'
  if (props.item.status === ATTENDANCE_WORKFLOW_STATUS.FINAL_PENDING) return 'text-purple-600 border-purple-400'
  if (props.item.status === ATTENDANCE_WORKFLOW_STATUS.GYEONGYU_PENDING) return 'text-blue-600 border-blue-400'
  if (props.item.status === ATTENDANCE_WORKFLOW_STATUS.LEGACY_DEPT_APPROVED) return 'text-purple-600 border-purple-400'
  if (props.item.status === ATTENDANCE_WORKFLOW_STATUS.REJECTED) return 'text-red-500 border-red-400'
  return 'text-amber-600 border-amber-400'
})

const statusLabel = computed(() => {
  if (isGyeongyuPending(props.item)) return '경유 대기'
  if (isFinalApprovalPending(props.item)) return '최종 승인 대기'
  if (props.item.status === ATTENDANCE_WORKFLOW_STATUS.LEGACY_DEPT_APPROVED) return '부서장 승인'
  return props.item.status
})
</script>

<template>
  <div class="attendance-leave-document" :class="{ 'attendance-leave-document--print': printMode }">
    <div class="doc-body">
      <h1 class="doc-title">휴&nbsp;가&nbsp;신&nbsp;청&nbsp;서</h1>

      <div class="approval-tables">
      <table class="gyeongyu-table">
        <thead>
          <tr>
            <th>경유</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="stamp-cell">
              <div v-if="item.gyeongyuBy" class="stamp-wrap">
                <img :src="gyeongyuStampUrl" alt="경유 도장" class="stamp-img" />
                <span class="stamp-name">{{ GYEONGYU_DISPLAY_NAME }}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td class="date-cell">{{ item.gyeongyuAt ? formatSignerDate(item.gyeongyuAt) : '-' }}</td>
          </tr>
        </tbody>
      </table>

      <table class="signer-table">
        <thead>
          <tr>
            <th v-for="signer in approvalSigners" :key="signer.role">{{ signer.role }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td v-for="signer in approvalSigners" :key="signer.role" class="stamp-cell">
              <template v-if="shouldShowSignature(signer.profileName)">
                <div class="stamp-wrap">
                  <img :src="approvalStampUrl" :alt="`${signer.displayName} 도장`" class="stamp-img" />
                  <span class="stamp-name">{{ signer.displayName }}</span>
                </div>
              </template>
            </td>
          </tr>
          <tr>
            <td v-for="signer in approvalSigners" :key="`${signer.role}_date`" class="date-cell">
              {{ getSignerDate(signer.profileName) || '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <table class="content-table">
      <colgroup>
        <col class="label-col" />
        <col />
        <col class="label-col" />
        <col />
      </colgroup>
      <tbody>
        <tr>
          <th>신청인</th>
          <td class="bold">{{ item.userName }}</td>
          <th>소속</th>
          <td>{{ item.department || '-' }}</td>
        </tr>
        <tr>
          <th>휴가종류</th>
          <td>{{ item.leaveType }}</td>
          <th>신청일수</th>
          <td class="bold">{{ formatLeaveDaysCountLabel(item.leaveType, item.daysCount) }}</td>
        </tr>
        <tr>
          <th>휴가기간</th>
          <td colspan="3">{{ period }}</td>
        </tr>
        <tr>
          <th>사유</th>
          <td colspan="3" class="reason-cell">{{ reasonText || '-' }}</td>
        </tr>
        <tr v-if="!printMode">
          <th>처리상태</th>
          <td colspan="3">
            <span class="status-badge" :class="statusClass">{{ statusLabel }}</span>
            <span v-if="isBuseojanApproved && item.approvedBy" class="meta-text">({{ item.approvedBy }})</span>
            <span v-if="item.status === '승인' && item.daepyoBy" class="meta-text">({{ DAEPYO_DISPLAY_NAME }})</span>
            <span v-if="item.status === '반려' && item.rejectReason" class="reject-text">— {{ item.rejectReason }}</span>
          </td>
        </tr>
        <tr>
          <th>신청일</th>
          <td colspan="3">{{ fmt(item.createdAt) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="signature-footer">
      <p class="footer-note">위와 같이 휴가를 신청합니다.</p>
      <p class="footer-date">{{ applicationDate }}</p>
      <div class="signature-box-wrap">
        <span class="signature-label">신청인</span>
        <div class="signature-box">
          <img
            v-if="item.signatureUrl"
            :src="item.signatureUrl"
            :alt="`${item.userName} 서명`"
            class="signature-img"
          />
          <span v-else class="signature-empty">(서명 없음)</span>
        </div>
        <span class="signature-name">{{ item.userName }}</span>
      </div>
    </div>
    </div>

    <div v-if="printMode" class="doc-brand-footer">
      <img :src="niceentechLogoUrl" alt="NICEENTECH" class="brand-logo" />
      <span class="brand-name">NICEENTECH</span>
    </div>
  </div>
</template>

<style src="./attendanceLeaveDocument.css"></style>
