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
import AttendancePasswordKeypad from './AttendancePasswordKeypad.vue'
import DailyWorkHoursInputDialog from './DailyWorkHoursInputDialog.vue'
import DailyWorkHoursPanel from './DailyWorkHoursPanel.vue'
import AttendanceEvidencePicker from './AttendanceEvidencePicker.vue'
import AttendanceEvidenceGalleryDialog from './AttendanceEvidenceGalleryDialog.vue'
import AttendanceRequestTable from './AttendanceRequestTable.vue'
import type { DailyWorkHour } from '../types/attendance'
import { isDeptHeadPending, isFinalApprovalPending, isGyeongyuPending } from '../utils/attendanceApprover'
import { formatLeaveDaysCountLabel, isHalfDayLeaveType, LEAVE_TYPE_ABSENCE, LEAVE_TYPE_HOME, LEAVE_TYPE_OUTING } from '../utils/attendanceLeaveType'

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
  canManagePending: boolean
  approvalPendingCount: number
  daepyoPendingCount: number
  gyeongyuPendingCount: number
  loading: boolean
  formVisible: boolean
  formLoading: boolean
  formData: AttendanceFormState
  isEditForm: boolean
  hideFormEmployeeSelector: boolean
  editRequestId?: number | null
  toast: { show: boolean; message: string; type: 'success' | 'error' }
  rejectDialogVisible: boolean
  rejectTarget: AttendanceRequest | null
  rejectReason: string
  rejectEvidenceUrls: string[]
  signatureRequestVisible: boolean
  detailItem: AttendanceRequest | null
  detailSignatures: import('../services/attendance.service').SignatureInfo[]
  todayWorkDate: string
  dailyWorkHours: DailyWorkHour[]
  dailyWorkRequests: AttendanceRequest[]
  dailyWorkHoursLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:filters', value: AttendanceFilters): void
  (e: 'printAllApproved'): void
  (e: 'update:summaryYear', value: number): void
  (e: 'update:summaryMonth', value: number): void
  (e: 'update:formData', value: AttendanceFormState): void
  (e: 'update:rejectReason', value: string): void
  (e: 'update:rejectEvidenceUrls', value: string[]): void
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
  (e: 'print', item: AttendanceRequest): void
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
  (e: 'workTimeEntry'): void
  (e: 'openFormForEmployee', employee: Employee): void
  (e: 'saveDailyWorkHours', records: { employeeId: number; endTime: string }[]): void
  (e: 'refreshDailyWorkHours'): void
  (e: 'deleteDailyWorkHour', payload: { workDate: string; employeeId: number }): void
  (e: 'deleteDailyWorkHoursBulk', payload: { workDate: string; employeeIds: number[] }): void
  (e: 'selectDailyWorkDate', workDate: string): void
  (e: 'updateDailyWorkHour', payload: { workDate: string; employeeId: number; endTime: string }): void
  (e: 'viewHistory', payload: { name: string; department: string }): void
}>()

const evidenceGalleryVisible = ref(false)
const evidenceGalleryUrls = ref<string[]>([])
const evidenceGalleryIndex = ref(0)

function openEvidenceGallery(urls: string[], index = 0) {
  evidenceGalleryUrls.value = urls ?? []
  evidenceGalleryIndex.value = index
  evidenceGalleryVisible.value = true
}

function closeEvidenceGallery() {
  evidenceGalleryVisible.value = false
}
const keypadEmployee = ref<Employee | null>(null)

function openKeypad(emp: Employee) {
  keypadEmployee.value = emp
}

function closeKeypad() {
  keypadEmployee.value = null
}

function onKeypadSuccess(emp: Employee) {
  keypadEmployee.value = null
  emit('openFormForEmployee', emp)
}

// 관리자 탭
const activeTab = ref<'requests' | 'employees' | 'summary' | 'analysis' | 'approval' | 'daepyo' | 'gyeongyu' | 'workhours'>('requests')

// 금일 작업시간 입력 다이얼로그
const workHoursDialogVisible = ref(false)
function openWorkHoursDialog() {
  workHoursDialogVisible.value = true
}
function closeWorkHoursDialog() {
  workHoursDialogVisible.value = false
}
function onSaveDailyWorkHours(records: { employeeId: number; endTime: string }[]) {
  emit('saveDailyWorkHours', records)
  workHoursDialogVisible.value = false
}
const selectedDailyWorkHours = computed(() =>
  props.dailyWorkHours.filter((item) => item.workDate === props.todayWorkDate),
)
const REQUESTS_PER_PAGE = 10
const requestsPage = ref(1)

// ─── 일반 사용자: 직원 명단 부서 선택 ──────────────────────────────────────────
const DEPT_ORDER = ['생산부', '용접부', '나사부', 'CNC', '지게차']
const directoryDepartments = computed(() => {
  const set = new Set(props.employees.map((e) => e.department).filter(Boolean))
  const ordered = DEPT_ORDER.filter((d) => set.has(d))
  const extras = [...set].filter((d) => !DEPT_ORDER.includes(d)).sort()
  return [...ordered, ...extras]
})
const selectedDirectoryDept = ref('')
const directoryEmployees = computed(() =>
  selectedDirectoryDept.value
    ? props.employees
        .filter((e) => e.department === selectedDirectoryDept.value)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    : [],
)


const statusBadge = (status: string) => {
  if (status === '승인') return 'bg-emerald-100 text-emerald-700'
  if (status === '반려') return 'bg-red-100 text-red-600'
  if (status === '최종대기' || status === '부서장승인') return 'bg-purple-100 text-purple-700'
  if (status === '경유대기') return 'bg-blue-100 text-blue-700'
  return 'bg-amber-100 text-amber-700'
}

const leaveTypeBadge = (type: string) => {
  if (isHalfDayLeaveType(type)) return 'bg-blue-100 text-blue-700'
  if (type === LEAVE_TYPE_OUTING) return 'bg-cyan-100 text-cyan-700'
  if (type === LEAVE_TYPE_ABSENCE) return 'bg-rose-100 text-rose-700'
  if (type === LEAVE_TYPE_HOME) return 'bg-indigo-100 text-indigo-700'
  if (type === '병가') return 'bg-purple-100 text-purple-700'
  if (type === '연차') return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-500'
}

const thisMonthLabel = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`
})

const totalRequestPages = computed(() => Math.max(1, Math.ceil(props.items.length / REQUESTS_PER_PAGE)))
const pagedRequestItems = computed(() => {
  const start = (requestsPage.value - 1) * REQUESTS_PER_PAGE
  return props.items.slice(start, start + REQUESTS_PER_PAGE)
})
const deptHeadPendingItems = computed(() => props.items.filter(isDeptHeadPending))
const gyeongyuPendingItems = computed(() => props.items.filter(isGyeongyuPending))
const finalApprovalPendingItems = computed(() => props.items.filter(isFinalApprovalPending))
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
  <div class="min-h-screen bg-slate-50">
    <div class="w-full px-[5px] pb-8 pt-[15px] sm:px-5">

      <!-- 페이지 헤더 -->
      <div class="mb-7 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900">생산부 근태관리</h1>
          <p class="mt-1 text-sm text-slate-500">{{ thisMonthLabel }} 휴가 신청 및 근태 현황</p>
        </div>
      </div>

      <!-- 통계 카드 (관리자만) -->
      <div v-if="isAdmin" class="mb-4 grid grid-cols-4 gap-1.5">
        <div class="rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm">
          <p class="truncate text-[10px] font-bold text-slate-400">총 직원</p>
          <p class="mt-0.5 text-base font-extrabold text-slate-900">
            {{ stats.employeeCount }}<span class="ml-0.5 text-[10px] font-bold text-slate-400">명</span>
          </p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm">
          <p class="truncate text-[10px] font-bold text-slate-400">이번달 신청</p>
          <p class="mt-0.5 text-base font-extrabold text-slate-900">
            {{ stats.thisMonthTotal }}<span class="ml-0.5 text-[10px] font-bold text-slate-400">건</span>
          </p>
        </div>
        <div class="rounded-lg border border-amber-100 bg-amber-50 px-2 py-2 shadow-sm">
          <p class="truncate text-[10px] font-bold text-amber-500">승인 대기</p>
          <p class="mt-0.5 text-base font-extrabold text-amber-700">
            {{ stats.pendingCount }}<span class="ml-0.5 text-[10px] font-bold text-amber-400">건</span>
          </p>
        </div>
        <div class="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-2 shadow-sm">
          <p class="truncate text-[10px] font-bold text-emerald-600">승인 완료</p>
          <p class="mt-0.5 text-base font-extrabold text-emerald-700">
            {{ stats.approvedCount }}<span class="ml-0.5 text-[10px] font-bold text-emerald-400">건</span>
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
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-bold transition-colors"
          :class="activeTab === 'workhours' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'workhours'"
        >작업시간</button>
      </div>

      <!-- ═══ 금일 작업시간 탭 (관리자) ═══ -->
      <DailyWorkHoursPanel
        v-if="isAdmin && activeTab === 'workhours'"
        :employees="employees"
        :requests="dailyWorkRequests"
        :work-hours="dailyWorkHours"
        :work-date="todayWorkDate"
        :loading="dailyWorkHoursLoading"
        @open-input="openWorkHoursDialog"
        @refresh="emit('refreshDailyWorkHours')"
        @delete="emit('deleteDailyWorkHour', $event)"
        @delete-all="emit('deleteDailyWorkHoursBulk', $event)"
        @update="emit('updateDailyWorkHour', $event)"
        @select-date="emit('selectDailyWorkDate', $event)"
      />

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
        <div v-if="deptHeadPendingItems.length === 0"
          class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
          승인 대기 중인 신청이 없습니다.
        </div>
        <AttendanceRequestTable
          v-else
          :items="deptHeadPendingItems"
          mode="approval"
          :leave-badge-class="leaveTypeBadge"
          @open-detail="emit('openDetail', $event)"
          @open-evidence="openEvidenceGallery($event.urls, $event.index)"
          @approve="emit('approve', $event)"
          @reject="emit('openReject', $event)"
        />
      </template>

      <!-- ═══ 경유 대기 탭 ═══ -->
      <template v-if="isAdmin && activeTab === 'gyeongyu'">
        <div v-if="gyeongyuPendingItems.length === 0"
          class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
          경유 대기 중인 신청이 없습니다.
        </div>
        <AttendanceRequestTable
          v-else
          :items="gyeongyuPendingItems"
          mode="gyeongyu"
          :can-manage="canManagePending"
          :leave-badge-class="leaveTypeBadge"
          @open-detail="emit('openDetail', $event)"
          @open-evidence="openEvidenceGallery($event.urls, $event.index)"
          @gyeongyu="emit('gyeongyu', $event)"
          @admin-edit="emit('adminEdit', $event)"
          @admin-delete="emit('adminDelete', $event)"
        />
      </template>

      <!-- ═══ 최종승인 대기 탭 ═══ -->
      <template v-if="isAdmin && activeTab === 'daepyo'">
        <div v-if="finalApprovalPendingItems.length === 0"
          class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
          최종 승인 대기 중인 신청이 없습니다.
        </div>
        <AttendanceRequestTable
          v-else
          :items="finalApprovalPendingItems"
          mode="daepyo"
          :can-manage="canManagePending"
          :leave-badge-class="leaveTypeBadge"
          @open-detail="emit('openDetail', $event)"
          @open-evidence="openEvidenceGallery($event.urls, $event.index)"
          @daepyo-approve="emit('daepyoApprove', $event)"
          @reject="emit('openReject', $event)"
          @admin-edit="emit('adminEdit', $event)"
          @admin-delete="emit('adminDelete', $event)"
        />
      </template>

      <!-- ═══ 일반 사용자 뷰 ═══ -->
      <template v-if="!isAdmin">
        <!-- 내 연차 현황 -->
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

        <!-- 직원 명단 -->
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-base font-extrabold text-slate-800">
              {{ selectedDirectoryDept ? `${selectedDirectoryDept} 직원 명단` : '직원 명단' }}
            </h2>
            <button
              v-if="selectedDirectoryDept"
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              @click="selectedDirectoryDept = ''"
            >
              ← 돌아가기
            </button>
          </div>

          <!-- 부서 선택 (초기 화면) -->
          <div v-if="!selectedDirectoryDept" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              v-for="d in directoryDepartments"
              :key="d"
              type="button"
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-base font-extrabold text-slate-800 transition-colors hover:bg-slate-900 hover:text-white"
              @click="selectedDirectoryDept = d"
            >
              {{ d }}
            </button>
          </div>

          <!-- 직원 카드 (부서 선택 후) -->
          <div v-else-if="directoryEmployees.length === 0" class="py-12 text-center text-sm text-slate-400">
            해당 부서에 등록된 직원이 없습니다.
          </div>
          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <button
              v-for="emp in directoryEmployees"
              :key="emp.id"
              type="button"
              class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center transition-colors hover:border-slate-900 hover:bg-white"
              @click="openKeypad(emp)"
            >
              <p class="truncate text-sm font-extrabold text-slate-900">{{ emp.name }}</p>
              <p class="mt-1 text-[11px] font-bold text-slate-500">{{ emp.assignedDepartment || emp.department || '-' }}</p>
            </button>
          </div>
        </div>
      </template>

      <!-- 비밀번호 키패드 -->
      <AttendancePasswordKeypad
        v-if="keypadEmployee"
        :employee="keypadEmployee"
        @success="onKeypadSuccess"
        @cancel="closeKeypad"
      />

      <!-- 금일 작업시간 입력 다이얼로그 -->
      <DailyWorkHoursInputDialog
        v-if="workHoursDialogVisible"
        :employees="employees"
        :requests="dailyWorkRequests"
        :today-hours="selectedDailyWorkHours"
        :work-date="todayWorkDate"
        @close="closeWorkHoursDialog"
        @save="onSaveDailyWorkHours"
      />

      <!-- ═══ 신청 현황 탭 (관리자 전용) ═══ -->
      <template v-if="isAdmin && activeTab === 'requests'">

        <!-- 필터 -->
        <div class="mb-5">
          <AttendanceFiltersComp
            :filters="filters"
            :departments="departments"
            :is-admin="isAdmin"
            @update:filters="emit('update:filters', $event)"
            @print-all-approved="emit('printAllApproved')"
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
              <template v-else>
                <AttendanceRequestTable
                  :items="pagedRequestItems"
                  mode="requests"
                  :is-root-admin="isRootAdmin"
                  :leave-badge-class="leaveTypeBadge"
                  :status-badge-class="statusBadge"
                  @open-detail="emit('openDetail', $event)"
                  @open-evidence="openEvidenceGallery($event.urls, $event.index)"
                  @admin-edit="emit('adminEdit', $event)"
                  @admin-delete="emit('adminDelete', $event)"
                  @print="emit('print', $event)"
                />
                <div class="flex items-center justify-center gap-2 pt-3">
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
              </template>
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
            :hide-employee-selector="hideFormEmployeeSelector"
            :exclude-request-id="editRequestId"
            :upload-user-id="currentUserId"
            @update:model-value="emit('update:formData', $event)"
            @submit="emit('submitForm')"
            @cancel="emit('closeForm')"
            @view-history="emit('viewHistory', $event)"
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
            {{ rejectTarget.userName }} · {{ rejectTarget.leaveType }} · {{ formatLeaveDaysCountLabel(rejectTarget.leaveType, rejectTarget.daysCount) }}
          </p>
          <textarea
            :value="rejectReason"
            rows="3"
            placeholder="반려 사유를 입력하세요"
            class="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            @input="emit('update:rejectReason', ($event.target as HTMLTextAreaElement).value)"
          />
          <div class="mt-4">
            <AttendanceEvidencePicker
              :model-value="rejectEvidenceUrls"
              :user-id="currentUserId"
              @update:model-value="emit('update:rejectEvidenceUrls', $event)"
            />
          </div>
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
        :employees="employees"
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

    <!-- 증빙 사진 갤러리 -->
    <AttendanceEvidenceGalleryDialog
      :visible="evidenceGalleryVisible"
      :urls="evidenceGalleryUrls"
      :start-index="evidenceGalleryIndex"
      @close="closeEvidenceGallery"
    />

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
