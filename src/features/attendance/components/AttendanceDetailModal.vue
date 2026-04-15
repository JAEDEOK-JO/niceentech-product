<script setup lang="ts">
import { computed } from 'vue'
import type { AttendanceRequest } from '../types/attendance'
import type { SignatureInfo } from '../services/attendance.service'

const props = defineProps<{
  item: AttendanceRequest
  signatures: SignatureInfo[]  // [쩌민튼, 조재덕, 이지형] 순서
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 서명자 3인: 담당(쩌민튼), 부서장(조재덕), 승인(이지형)
const SIGNERS = [
  { role: '담당', name: '쩌민튼' },
  { role: '부서장', name: '조재덕' },
  { role: '승인', name: '이지형' },
] as const

// 서명 표시 여부
// - 대기중/반려 → 담당(쩌민튼)만
// - 승인 → 전원
const isApproved = computed(() => props.item.status === '승인')

const shouldShowSignature = (name: string) => {
  if (name === '쩌민튼') return true          // 신청하면 담당 서명
  return isApproved.value                     // 승인되면 부서장·승인도 표시
}

const getSignaturePath = (name: string) =>
  props.signatures.find((s) => s.name === name)?.signaturePath ?? null

const fmt = (d: string) => (d ? d.slice(0, 10) : '-')

const period = computed(() => {
  const s = fmt(props.item.startDate)
  const e = fmt(props.item.endDate)
  return s === e ? s : `${s} ~ ${e}`
})

const today = new Date().toLocaleDateString('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric',
})

const statusClass = computed(() => {
  if (props.item.status === '승인') return 'text-emerald-600 border-emerald-400'
  if (props.item.status === '반려') return 'text-red-500 border-red-400'
  return 'text-amber-600 border-amber-400'
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

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

        <!-- 결재란 -->
        <div class="mb-6 flex justify-end">
          <table class="border-collapse text-xs">
            <thead>
              <tr>
                <th
                  v-for="signer in SIGNERS"
                  :key="signer.role"
                  class="border border-slate-300 bg-slate-50 px-5 py-1.5 text-center font-bold text-slate-600"
                >
                  {{ signer.role }}
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- 서명 이미지 행 -->
              <tr>
                <td
                  v-for="signer in SIGNERS"
                  :key="signer.name"
                  class="border border-slate-300 px-4 py-2 text-center"
                  style="width: 80px; height: 64px;"
                >
                  <template v-if="shouldShowSignature(signer.name)">
                    <img
                      v-if="getSignaturePath(signer.name)"
                      :src="getSignaturePath(signer.name)!"
                      :alt="`${signer.name} 서명`"
                      class="mx-auto h-10 w-full object-contain"
                    />
                    <!-- 서명 이미지 없을 때 이름으로 대체 -->
                    <span v-else class="text-xs font-bold text-slate-500">{{ signer.name }}</span>
                  </template>
                </td>
              </tr>
              <!-- 이름 행 -->
              <tr>
                <td
                  v-for="signer in SIGNERS"
                  :key="signer.name + '_name'"
                  class="border border-slate-300 px-2 py-1 text-center text-xs text-slate-500"
                >
                  {{ signer.name }}
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
              <td class="border border-slate-300 px-4 py-2.5 text-slate-700" colspan="3">{{ item.reason || '-' }}</td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-600">처리 상태</th>
              <td class="border border-slate-300 px-4 py-2.5" colspan="3">
                <span
                  class="rounded-full border px-3 py-0.5 text-xs font-bold"
                  :class="statusClass"
                >{{ item.status }}</span>
                <span v-if="item.status === '승인' && item.approvedBy" class="ml-2 text-xs text-slate-400">
                  ({{ item.approvedBy }})
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

        <!-- 하단 문구 -->
        <p class="mt-5 text-right text-xs text-slate-400">
          위와 같이 휴가를 신청합니다.&nbsp;&nbsp;{{ today }}
        </p>
      </div>
    </div>
  </div>
</template>
