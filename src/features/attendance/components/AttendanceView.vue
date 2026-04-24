<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  AttendanceRequest,
  AttendanceFilters,
  AttendanceFormState,
  AttendanceAnnualQuota,
  AttendanceDashboardStats,
  Employee,
} from '../types/attendance'
import type { EmployeeFormData } from '../services/attendance.service'
import AttendanceFiltersComp from './AttendanceFilters.vue'
import AttendanceForm from './AttendanceForm.vue'
import AttendanceEmployeeList from './AttendanceEmployeeList.vue'
import AttendanceAnalysisPanel from './AttendanceAnalysisPanel.vue'
import AttendanceSummaryBoard from './AttendanceSummaryBoard.vue'
import AttendanceSummaryDetailModal from './AttendanceSummaryDetailModal.vue'
import AttendanceDetailModal from './AttendanceDetailModal.vue'
import AttendanceRequestSignatureDialog from './AttendanceRequestSignatureDialog.vue'

const props = defineProps<{
  items: AttendanceRequest[]
  filters: AttendanceFilters
  departments: string[]
  quota: AttendanceAnnualQuota | null
  stats: AttendanceDashboardStats
  employees: Employee[]
  employeesLoading: boolean
  summaryYear: number
  summaryMonth: number
  summaryLoading: boolean
  monthlySummaries: import('../types/attendance').AttendanceMonthlySummary[]
  summaryDetailVisible: boolean
  summaryDetailUserName: string
  summaryDetailDepartment: string
  summaryDetailRequests: AttendanceRequest[]
  currentUserId: string
  isAdmin: boolean
  isRootAdmin: boolean
  approvalPendingCount: number
  daepyoPendingCount: number
  gyeongyuPendingCount: number
  loading: boolean
  formVisible: boolean
  formLoading: boolean
  formData: AttendanceFormState
  isEditForm: boolean
  toast: { show: boolean; message: string; type: 'success' | 'error' }
  rejectDialogVisible: boolean
  rejectTarget: AttendanceRequest | null
  rejectReason: string
  signatureRequestVisible: boolean
  detailItem: AttendanceRequest | null
  detailSignatures: import('../services/attendance.service').SignatureInfo[]
}>()

const emit = defineEmits<{
  (e: 'update:filters', value: AttendanceFilters): void
  (e: 'update:summaryYear', value: number): void
  (e: 'update:summaryMonth', value: number): void
  (e: 'update:formData', value: AttendanceFormState): void
  (e: 'update:rejectReason', value: string): void
  (e: 'openSummaryDetail', summary: import('../types/attendance').AttendanceMonthlySummary): void
  (e: 'closeSummaryDetail'): void
  (e: 'openSummaryRequestDetail', item: AttendanceRequest): void
  (e: 'openForm'): void
  (e: 'closeForm'): void
  (e: 'submitForm'): void
  (e: 'edit', item: AttendanceRequest): void
  (e: 'delete', item: AttendanceRequest): void
  (e: 'approve', item: AttendanceRequest): void
  (e: 'openReject', item: AttendanceRequest): void
  (e: 'adminEdit', item: AttendanceRequest): void
  (e: 'adminDelete', item: AttendanceRequest): void
  (e: 'openDetail', item: AttendanceRequest): void
  (e: 'closeDetail'): void
  (e: 'closeReject'): void
  (e: 'submitReject'): void
  (e: 'daepyoApprove', item: AttendanceRequest): void
  (e: 'gyeongyu', item: AttendanceRequest): void
  (e: 'signatureConfirm', blob: Blob): void
  (e: 'signatureCancel'): void
  (e: 'createEmployee', data: EmployeeFormData): void
  (e: 'updateEmployee', payload: { id: number; data: EmployeeFormData }): void
  (e: 'deleteEmployee', id: number): void
}>()

// 관리자 탭
const activeTab = ref<'requests' | 'employees' | 'summary' | 'analysis' | 'approval' | 'daepyo' | 'gyeongyu'>('requests')
const REQUESTS_PER_PAGE = 10
const requestsPage = ref(1)


const statusBorder = (status: string) => {
  if (status === '승인') return 'border-l-emerald-500'
  if (status === '반려') return 'border-l-red-400'
  return 'border-l-amber-400'
}

const statusBadge = (status: string) => {
  if (status === '승인') return 'bg-emerald-100 text-emerald-700'
  if (status === '반려') return 'bg-red-100 text-red-600'
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

const thisMonthLabel = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`
})

const totalRequestPages = computed(() => Math.max(1, Math.ceil(props.items.length / REQUESTS_PER_PAGE)))
const pagedRequestItems = computed(() => {
  const start = (requestsPage.value - 1) * REQUESTS_PER_PAGE
  return props.items.slice(start, start + REQUESTS_PER_PAGE)
})
const canGoPrevPage = computed(() => requestsPage.value > 1)
const canGoNextPage = computed(() => requestsPage.value < totalRequestPages.value)
const moveRequestPage = (delta: number) => {
  const next = requestsPage.value + delta
  requestsPage.value = Math.min(totalRequestPages.value, Math.max(1, next))
}

watch(
  () => props.items,
  () => {
    requestsPage.value = 1
  },
  { deep: true },
)
</script>

<template>
  <div class="min-h-screen bg-slate-50 pt-[72px]">
    <div class="mx-auto max-w-6xl px-4 py-8 md:px-6">

      <!-- 페이지 헤더 -->
      <div class="mb-7 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900">생산부 근태관리</h1>
          <p class="mt-1 text-sm text-slate-500">{{ thisMonthLabel }} 휴가 신청 및 근태 현황</p>
        </div>
        <div v-if="activeTab === 'requests'" class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700"
            @click="emit('openForm')"
          >
            + 휴가 신청
          </button>
        </div>
      </div>

      <!-- 통계 카드 4개 -->
      <div class="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-400">총 직원</p>
          <p class="mt-2 text-3xl font-extrabold text-slate-900">
            {{ stats.employeeCount }}<span class="ml-1 text-base font-bold text-slate-400">명</span>
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-400">이번달 신청</p>
          <p class="mt-2 text-3xl font-extrabold text-slate-900">
            {{ stats.thisMonthTotal }}<span class="ml-1 text-base font-bold text-slate-400">건</span>
          </p>
        </div>
        <div class="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p class="text-xs font-medium text-amber-500">승인 대기</p>
          <p class="mt-2 text-3xl font-extrabold text-amber-700">
            {{ stats.pendingCount }}<span class="ml-1 text-base font-bold text-amber-400">건</span>
          </p>
        </div>
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p class="text-xs font-medium text-emerald-500">내 잔여연차</p>
          <p class="mt-2 text-3xl font-extrabold text-emerald-700">
            {{ stats.myRemainingDays }}<span class="ml-1 text-base font-bold text-emerald-400">일</span>
          </p>
        </div>
      </div>

      <!-- 관리자 탭 -->
      <div v-if="isAdmin" class="mb-5 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-bold transition-colors"
          :class="activeTab === 'requests' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'requests'"
        >신청 현황</button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-colors"
          :class="activeTab === 'approval' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'approval'"
        >
          부서장 대기
          <span
            v-if="approvalPendingCount > 0"
            class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white"
          >{{ approvalPendingCount }}</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-colors"
          :class="activeTab === 'daepyo' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'daepyo'"
        >
          최종승인 대기
          <span
            v-if="daepyoPendingCount > 0"
            class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-extrabold text-white"
          >{{ daepyoPendingCount }}</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-colors"
          :class="activeTab === 'gyeongyu' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'gyeongyu'"
        >
          경유 대기
          <span
            v-if="gyeongyuPendingCount > 0"
            class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-extrabold text-white"
          >{{ gyeongyuPendingCount }}</span>
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-bold transition-colors"
          :class="activeTab === 'summary' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'summary'"
        >근태요약</button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-bold transition-colors"
          :class="activeTab === 'employees' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'employees'"
        >직원 목록</button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-bold transition-colors"
          :class="activeTab === 'analysis' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'analysis'"
        >근태 분석</button>
      </div>

      <!-- ═══ 직원 목록 탭 (관리자) ═══ -->
      <AttendanceEmployeeList
        v-if="isAdmin && activeTab === 'employees'"
        :employees="employees"
        :loading="employeesLoading"
        @create="emit('createEmployee', $event)"
        @update="emit('updateEmployee', $event)"
        @delete="emit('deleteEmployee', $event)"
      />

      <!-- ═══ 근태 분석 탭 (관리자) ═══ -->
      <AttendanceAnalysisPanel
        v-if="isAdmin && activeTab === 'analysis'"
        :employees="employees"
      />

      <AttendanceSummaryBoard
        v-if="isAdmin && activeTab === 'summary'"
        :summaries="monthlySummaries"
        :loading="summaryLoading"
        :year="summaryYear"
        :month="summaryMonth"
        @update:year="emit('update:summaryYear', $event)"
        @update:month="emit('update:summaryMonth', $event)"
        @open-detail="emit('openSummaryDetail', $event)"
      />

      <!-- ═══ 부서장 대기 탭 ═══ -->
      <template v-if="isAdmin && activeTab === 'approval'">
        <div class="space-y-2">
          <div v-if="items.filter(i => i.status === '대기중').length === 0"
            class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
            승인 대기 중인 신청이 없습니다.
          </div>
          <div
            v-for="item in items.filter(i => i.status === '대기중')"
            :key="item.id"
            class="cursor-pointer rounded-xl border border-l-4 border-amber-300 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2" @click="emit('openDetail', item)">
                <span class="font-bold text-slate-900">{{ item.userName }}</span>
                <span class="text-xs text-slate-400">({{ item.department || '-' }})</span>
                <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">{{ item.leaveType }}</span>
                <span class="text-xs font-bold text-slate-700">{{ item.daysCount }}일</span>
                <span class="text-xs text-slate-400">{{ item.startDate.slice(0,10) }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <button type="button"
                  class="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                  @click="emit('approve', item)">승인</button>
                <button type="button"
                  class="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-400"
                  @click="emit('openReject', item)">반려</button>
              </div>
            </div>
            <p class="mt-1 text-xs text-slate-400" @click="emit('openDetail', item)">{{ item.reason || '-' }}</p>
          </div>
        </div>
      </template>

      <!-- ═══ 최종승인 대기 탭 ═══ -->
      <template v-if="isAdmin && activeTab === 'daepyo'">
        <div class="space-y-2">
          <div v-if="items.filter(i => i.status === '부서장승인').length === 0"
            class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
            최종 승인 대기 중인 신청이 없습니다.
          </div>
          <div
            v-for="item in items.filter(i => i.status === '부서장승인')"
            :key="item.id"
            class="cursor-pointer rounded-xl border border-l-4 border-purple-300 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2" @click="emit('openDetail', item)">
                <span class="font-bold text-slate-900">{{ item.userName }}</span>
                <span class="text-xs text-slate-400">({{ item.department || '-' }})</span>
                <span class="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-700">{{ item.leaveType }}</span>
                <span class="text-xs font-bold text-slate-700">{{ item.daysCount }}일</span>
                <span v-if="item.approvedBy" class="text-xs text-slate-400">부서장: {{ item.approvedBy }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <button type="button"
                  class="rounded-lg bg-purple-600 px-3 py-1 text-xs font-bold text-white hover:bg-purple-500"
                  @click="emit('daepyoApprove', item)">최종 승인</button>
                <button type="button"
                  class="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-400"
                  @click="emit('openReject', item)">반려</button>
              </div>
            </div>
            <p class="mt-1 text-xs text-slate-400" @click="emit('openDetail', item)">{{ item.reason || '-' }}</p>
          </div>
        </div>
      </template>

      <!-- ═══ 경유 대기 탭 ═══ -->
      <template v-if="isAdmin && activeTab === 'gyeongyu'">
        <div class="space-y-2">
          <div v-if="items.filter(i => !i.gyeongyuBy).length === 0"
            class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
            경유 대기 중인 신청이 없습니다.
          </div>
          <div
            v-for="item in items.filter(i => !i.gyeongyuBy)"
            :key="item.id"
            class="cursor-pointer rounded-xl border border-l-4 border-blue-300 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2" @click="emit('openDetail', item)">
                <span class="font-bold text-slate-900">{{ item.userName }}</span>
                <span class="text-xs text-slate-400">({{ item.department || '-' }})</span>
                <span class="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">{{ item.leaveType }}</span>
                <span class="text-xs font-bold text-slate-700">{{ item.daysCount }}일</span>
                <span class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  :class="item.status === '승인' ? 'bg-emerald-100 text-emerald-700' : item.status === '반려' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'">
                  {{ item.status }}
                </span>
              </div>
              <button type="button"
                class="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500"
                @click="emit('gyeongyu', item)">경유</button>
            </div>
            <p class="mt-1 text-xs text-slate-400" @click="emit('openDetail', item)">{{ item.reason || '-' }}</p>
          </div>
        </div>
      </template>

      <!-- ═══ 신청 현황 탭 ═══ -->
      <template v-if="!isAdmin || activeTab === 'requests'">

        <!-- 필터 -->
        <div class="mb-5">
          <AttendanceFiltersComp
            :filters="filters"
            :departments="departments"
            :is-admin="isAdmin"
            @update:filters="emit('update:filters', $event)"
          />
        </div>

        <!-- 로딩 -->
        <div v-if="loading" class="py-20 text-center">
          <div class="inline-block h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          <p class="mt-3 text-sm text-slate-400">불러오는 중...</p>
        </div>

        <template v-else>

          <!-- ── 관리자 뷰 ── -->
          <div v-if="isAdmin">
            <div class="min-w-0">
              <h2 class="mb-3 text-sm font-extrabold text-slate-700">신청 현황</h2>
              <div v-if="items.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
                신청 내역이 없습니다.
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="item in pagedRequestItems"
                  :key="item.id"
                  class="cursor-pointer rounded-xl border border-l-4 border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
                  :class="statusBorder(item.status)"
                  @click.self="emit('openDetail', item)"
                >
                  <div class="flex flex-wrap items-start justify-between gap-2" @click="emit('openDetail', item)">
                    <div class="min-w-0 flex flex-wrap items-center gap-2">
                      <span class="font-bold text-slate-900">{{ item.userName }}</span>
                      <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="leaveTypeBadge(item.leaveType)">
                        {{ item.leaveType }}
                      </span>
                      <span class="text-xs font-bold text-slate-700">{{ item.daysCount }}일</span>
                    </div>
                    <div class="flex items-center gap-2" @click.stop>
                      <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="statusBadge(item.status)">
                        {{ item.status }}
                      </span>
                      <template v-if="item.status !== '승인'">
                        <button type="button" class="rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50" @click="emit('adminEdit', item)">수정</button>
                        <button type="button" class="rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50" @click="emit('adminDelete', item)">삭제</button>
                      </template>
                      <template v-else-if="isRootAdmin">
                        <button type="button" class="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100" @click="emit('adminDelete', item)">삭제</button>
                      </template>
                    </div>
                  </div>
                  <div class="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500" @click="emit('openDetail', item)">
                    <span>{{ formatPeriod(item) }}</span>
                    <span v-if="item.status === '승인' && item.approvedBy" class="text-slate-400">승인: {{ item.approvedBy }}</span>
                    <span v-else-if="item.status === '반려' && item.rejectReason" class="text-red-500">반려: {{ item.rejectReason }}</span>
                    <span class="truncate">{{ item.reason || '-' }}</span>
                  </div>
                </div>
                <div class="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    class="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    :disabled="!canGoPrevPage"
                    @click="moveRequestPage(-1)"
                  >
                    이전
                  </button>
                  <span class="text-xs font-semibold text-slate-500">{{ requestsPage }} / {{ totalRequestPages }}</span>
                  <button
                    type="button"
                    class="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    :disabled="!canGoNextPage"
                    @click="moveRequestPage(1)"
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ── 일반 사용자 뷰: 전체 신청 리스트 (읽기 전용 + 본인 것만 액션) ── -->
          <div v-else>
            <!-- 내 연차 잔여 바 -->
            <div v-if="quota" class="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div class="mb-2 flex items-center justify-between text-sm">
                <span class="font-bold text-slate-700">내 연차 현황</span>
                <span class="text-slate-500">{{ quota.usedDays }} / {{ quota.totalDays }}일 사용</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  class="h-full rounded-full bg-emerald-500 transition-all"
                  :style="{ width: `${quota.totalDays > 0 ? Math.min(100, (quota.usedDays / quota.totalDays) * 100) : 0}%` }"
                />
              </div>
              <p class="mt-1.5 text-right text-xs text-slate-400">잔여 {{ quota.remainingDays }}일</p>
            </div>

            <!-- 전체 신청 목록 -->
            <div v-if="items.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
              신청 내역이 없습니다.
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="item in pagedRequestItems"
                :key="item.id"
                class="cursor-pointer rounded-xl border border-l-4 border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
                :class="statusBorder(item.status)"
                @click="emit('openDetail', item)"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-bold text-slate-900">{{ item.userName }}</span>
                      <span v-if="item.userId === currentUserId" class="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">나</span>
                      <span class="rounded-full px-2 py-0.5 text-xs font-bold" :class="leaveTypeBadge(item.leaveType)">{{ item.leaveType }}</span>
                      <span class="text-xs font-bold text-slate-700">{{ item.daysCount }}일</span>
                    </div>
                    <p class="mt-1 text-xs text-slate-500">
                      {{ formatPeriod(item) }}
                      <span v-if="item.status === '승인' && item.approvedBy"> · 승인: {{ item.approvedBy }}</span>
                      <span v-else-if="item.status === '반려' && item.rejectReason"> · 반려: {{ item.rejectReason }}</span>
                      <span v-if="item.reason"> · {{ item.reason }}</span>
                    </p>
                  </div>

                  <!-- 상태 + 본인 액션 -->
                  <div class="flex shrink-0 items-center gap-2" @click.stop>
                    <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="statusBadge(item.status)">{{ item.status }}</span>
                    <template v-if="item.userId === currentUserId && item.status === '대기중'">
                      <button type="button" class="rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50" @click="emit('edit', item)">수정</button>
                      <button type="button" class="rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50" @click="emit('delete', item)">취소</button>
                    </template>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  class="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  :disabled="!canGoPrevPage"
                  @click="moveRequestPage(-1)"
                >
                  이전
                </button>
                <span class="text-xs font-semibold text-slate-500">{{ requestsPage }} / {{ totalRequestPages }}</span>
                <button
                  type="button"
                  class="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  :disabled="!canGoNextPage"
                  @click="moveRequestPage(1)"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- 신청 폼 모달 (formVisible 변경마다 key로 re-mount → 상태 초기화) -->
    <Teleport to="body">
      <div
        v-if="formVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        @click.self="emit('closeForm')"
      >
        <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <h2 class="mb-5 text-lg font-extrabold text-slate-900">
            {{ isEditForm ? '휴가 신청 수정' : '휴가 신청' }}
          </h2>
          <AttendanceForm
            :key="String(isEditForm) + formData.startDate"
            :model-value="formData"
            :loading="formLoading"
            :is-edit="isEditForm"
            :employees="employees"
            @update:model-value="emit('update:formData', $event)"
            @submit="emit('submitForm')"
            @cancel="emit('closeForm')"
          />
        </div>
      </div>
    </Teleport>

    <!-- 반려 사유 모달 -->
    <Teleport to="body">
      <div
        v-if="rejectDialogVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        @click.self="emit('closeReject')"
      >
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <h2 class="mb-1 text-lg font-extrabold text-slate-900">반려 사유</h2>
          <p v-if="rejectTarget" class="mb-4 text-sm text-slate-500">
            {{ rejectTarget.userName }} · {{ rejectTarget.leaveType }} · {{ rejectTarget.daysCount }}일
          </p>
          <textarea
            :value="rejectReason"
            rows="3"
            placeholder="반려 사유를 입력하세요"
            class="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            @input="emit('update:rejectReason', ($event.target as HTMLTextAreaElement).value)"
          />
          <div class="mt-4 flex justify-end gap-3">
            <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" @click="emit('closeReject')">취소</button>
            <button type="button" class="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400" @click="emit('submitReject')">반려 처리</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 디테일 모달 -->
    <Teleport to="body">
      <AttendanceSummaryDetailModal
        :visible="summaryDetailVisible"
        :user-name="summaryDetailUserName"
        :department="summaryDetailDepartment"
        :requests="summaryDetailRequests"
        @close="emit('closeSummaryDetail')"
        @select="emit('openSummaryRequestDetail', $event)"
      />
    </Teleport>

    <Teleport to="body">
      <AttendanceDetailModal
        v-if="detailItem"
        :item="detailItem"
        :signatures="detailSignatures"
        @close="emit('closeDetail')"
      />
    </Teleport>

    <!-- 신청 서명 다이얼로그 -->
    <Teleport to="body">
      <AttendanceRequestSignatureDialog
        v-if="signatureRequestVisible"
        @confirm="emit('signatureConfirm', $event)"
        @cancel="emit('signatureCancel')"
      />
    </Teleport>

    <!-- 토스트 -->
    <Teleport to="body">
      <transition name="toast">
        <div
          v-if="toast.show"
          class="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg"
          :class="toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'"
        >
          {{ toast.message }}
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
</style>
