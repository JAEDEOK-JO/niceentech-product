<script setup lang="ts">
import { computed } from 'vue'
import approvalStampUrl from '../approval-stamp.svg?url'
import gyeongyuStampUrl from '../gyeongyu-stamp.svg?url'

const GYEONGYU_DISPLAY_NAME = '이지형'
import type { AttendanceRequest } from '../types/attendance'
import type { SignatureInfo } from '../services/attendance.service'
import { formatAttendanceReasonText } from '../utils/attendanceReason'

const props = defineProps<{
  item: AttendanceRequest
  signatures: SignatureInfo[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const APPROVAL_SIGNERS = [
  { role: '담당',  profileName: '쩌민튼',               displayName: '쩌민튼' },
  { role: '부서장', profileName: 'duko777@niceentech.kr', displayName: '조재덕' },
  { role: '대표이사',  profileName: '__daepyo__',            displayName: '' },
] as const

const isApproved = computed(() => props.item.status === '승인')
const isBuseojanApproved = computed(() =>
  props.item.status === '부서장승인' || props.item.status === '승인'
)

const shouldShowSignature = (name: string) => {
  if (!name) return false
  if (name === '쩌민튼') return true
  if (name === 'duko777@niceentech.kr') return isBuseojanApproved.value
  if (name === '__daepyo__') return isApproved.value && !!props.item.daepyoBy
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
  if (profileName === '쩌민튼') return formatSignerDate(props.item.createdAt)
  if (profileName === 'duko777@niceentech.kr' && isBuseojanApproved.value) return formatSignerDate(props.item.approvedAt)
  if (profileName === '__daepyo__' && isApproved.value) return formatSignerDate(props.item.daepyoAt)
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

const today = new Date().toLocaleDateString('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric',
})

const statusClass = computed(() => {
  if (props.item.status === '승인') return 'text-emerald-600 border-emerald-400'
  if (props.item.status === '부서장승인') return 'text-purple-600 border-purple-400'
  if (props.item.status === '반려') return 'text-red-500 border-red-400'
  return 'text-amber-600 border-amber-400'
})

const statusLabel = computed(() => {
  if (props.item.status === '부서장승인') return '부서장 승인'
  return props.item.status
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">

      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="text-base font-extrabold text-slate-700">휴가 신청 상세</h2>
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

      <!-- 문서 본문 -->
      <div class="p-6">

        <!-- 문서 제목 -->
        <h1 class="mb-6 text-center text-2xl font-extrabold tracking-widest text-slate-900">
          휴&nbsp;가&nbsp;신&nbsp;청&nbsp;서
        </h1>

        <!-- 결재란: 경유(왼쪽) + 담당·부서장·대표이사(오른쪽) -->
        <div class="mb-6 flex items-start justify-between gap-4">

          <!-- 왼쪽: 경유 -->
          <table class="table-fixed border-collapse text-xs">
            <thead>
              <tr>
                <th class="border border-slate-300 bg-slate-50 px-5 py-1.5 text-center font-bold text-slate-600">경유</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-slate-300 p-[2px] text-center" style="width: 80px; height: 64px;">
                  <div v-if="item.gyeongyuBy" class="flex h-[58px] w-full flex-col items-center justify-center gap-0.5 overflow-hidden">
                    <img
                      :src="gyeongyuStampUrl"
                      alt="경유 도장"
                      class="block h-[42px] w-full object-contain"
                    />
                    <span class="text-[10px] leading-none font-bold text-blue-700">{{ GYEONGYU_DISPLAY_NAME }}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="border border-slate-300 px-2 py-1 text-center text-xs text-slate-500">
                  {{ item.gyeongyuAt ? formatSignerDate(item.gyeongyuAt) : '-' }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 오른쪽: 담당 · 부서장 · 대표이사 -->
          <table class="border-collapse text-xs">
            <thead>
              <tr>
                <th
                  v-for="signer in APPROVAL_SIGNERS"
                  :key="signer.role"
                  class="border border-slate-300 bg-slate-50 px-5 py-1.5 text-center font-bold text-slate-600"
                  style="width: 92px;"
                >
                  {{ signer.role }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  v-for="signer in APPROVAL_SIGNERS"
                  :key="signer.role"
                  class="border border-slate-300 p-[2px] text-center"
                  style="width: 92px; height: 64px;"
                >
                  <template v-if="shouldShowSignature(signer.profileName)">
                    <div class="flex h-[58px] w-full flex-col items-center justify-center gap-0.5 overflow-hidden">
                      <img
                        :src="approvalStampUrl"
                        :alt="`${signer.profileName === '__daepyo__' ? item.daepyoBy : signer.displayName} 도장`"
                        class="block h-[42px] w-full object-contain"
                      />
                      <span class="text-[10px] leading-none font-bold text-slate-700">
                        {{ signer.profileName === '__daepyo__' ? item.daepyoBy : signer.displayName }}
                      </span>
                    </div>
                  </template>
                </td>
              </tr>
              <tr>
                <td
                  v-for="signer in APPROVAL_SIGNERS"
                  :key="signer.role + '_date'"
                  class="border border-slate-300 px-2 py-1 text-center text-xs text-slate-500"
                  style="width: 92px;"
                >
                  {{ getSignerDate(signer.profileName) || '-' }}
                </td>
              </tr>
            </tbody>
          </table>

        </div>

        <!-- 신청 내용 테이블 -->
        <table class="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <th class="w-28 border border-slate-300 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-600">신청인</th>
              <td class="border border-slate-300 px-4 py-2.5 font-bold text-slate-900">{{ item.userName }}</td>
              <th class="w-28 border border-slate-300 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-600">소속</th>
              <td class="border border-slate-300 px-4 py-2.5 text-slate-700">{{ item.department || '-' }}</td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-600">휴가 종류</th>
              <td class="border border-slate-300 px-4 py-2.5 text-slate-800">{{ item.leaveType }}</td>
              <th class="border border-slate-300 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-600">신청 일수</th>
              <td class="border border-slate-300 px-4 py-2.5 font-bold text-slate-900">{{ item.daysCount }}일</td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-600">휴가 기간</th>
              <td class="border border-slate-300 px-4 py-2.5 text-slate-800" colspan="3">{{ period }}</td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-600">사유</th>
              <td class="border border-slate-300 px-4 py-2.5 text-slate-700" colspan="3">{{ reasonText || '-' }}</td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-600">처리 상태</th>
              <td class="border border-slate-300 px-4 py-2.5" colspan="3">
                <span
                  class="rounded-full border px-3 py-0.5 text-xs font-bold"
                  :class="statusClass"
                >{{ statusLabel }}</span>
                <span v-if="item.status === '부서장승인' && item.approvedBy" class="ml-2 text-xs text-slate-400">
                  ({{ item.approvedBy }})
                </span>
                <span v-if="item.status === '승인' && item.daepyoBy" class="ml-2 text-xs text-slate-400">
                  ({{ item.daepyoBy }})
                </span>
                <span v-if="item.status === '반려' && item.rejectReason" class="ml-2 text-xs text-red-500">
                  — {{ item.rejectReason }}
                </span>
              </td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-600">신청일</th>
              <td class="border border-slate-300 px-4 py-2.5 text-slate-600" colspan="3">{{ fmt(item.createdAt) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- 신청인 서명 -->
        <div class="mt-5 flex items-end justify-end gap-4 border-t border-slate-100 pt-5">
          <p class="text-xs text-slate-400">위와 같이 휴가를 신청합니다.&nbsp;&nbsp;{{ today }}</p>
          <div class="flex flex-col items-center gap-1">
            <span class="text-xs font-bold text-slate-500">신청인 : {{ item.userName }}</span>
            <div class="flex h-16 w-32 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img
                v-if="item.signatureUrl"
                :src="item.signatureUrl"
                :alt="`${item.userName} 서명`"
                class="max-h-full max-w-full object-contain"
              />
              <span v-else class="text-xs text-slate-300">(서명 없음)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
