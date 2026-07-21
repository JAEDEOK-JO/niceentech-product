<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  HOME_LEAVE_REASON,
  HOME_LEAVE_REASON_WEDDING,
  LEAVE_REASONS,
  LEAVE_TYPES,
  type AttendanceFormState,
  type AttendanceRequest,
  type LeaveType,
  type Employee,
} from '../types/attendance'
import { fetchEmployeeHomeLeaveRequests } from '../services/attendance.service'
import AttendanceEvidencePicker from './AttendanceEvidencePicker.vue'
import {
  deductsAnnualLeave,
  formatLeaveDaysCountLabel,
  getFixedLeaveDaysCount,
  getLeaveDurationHint,
  isHomeLeaveType,
  isSingleDayLeaveType,
} from '../utils/attendanceLeaveType'
import {
  HOME_LEAVE_DURATION_1M,
  HOME_LEAVE_DURATION_2M_WEDDING,
  HOME_LEAVE_DURATIONS,
  type HomeLeaveDuration,
  calcHomeLeaveEndDate,
  formatHomeLeaveEligibleDate,
  getHomeLeaveDurationFromReason,
  getHomeLeaveMonths,
  getHomeLeaveReasonForDuration,
  resolveHomeLeaveEligibility,
} from '../utils/homeLeavePolicy'

const props = defineProps<{
  modelValue: AttendanceFormState
  loading: boolean
  isEdit: boolean
  employees: Employee[]
  hideEmployeeSelector?: boolean
  excludeRequestId?: number | null
  uploadUserId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AttendanceFormState): void
  (e: 'submit'): void
  (e: 'cancel'): void
  (e: 'viewHistory', payload: { name: string; department: string }): void
}>()

const form = ref<AttendanceFormState>({
  ...props.modelValue,
  evidenceUrls: [...(props.modelValue.evidenceUrls ?? [])],
})
const homeLeaveRequests = ref<AttendanceRequest[]>([])
const homeLeaveLoading = ref(false)

// 부서 목록 (employees에서 추출, 고정 순서)
const DEPT_ORDER = ['생산부', '용접부', '나사부', 'CNC', '지게차']
const departments = computed(() => {
  const set = new Set(props.employees.map((e) => e.department).filter(Boolean))
  return DEPT_ORDER.filter((d) => set.has(d))
})

// 선택된 부서의 직원 이름 목록
const employeeNames = computed(() => {
  if (!form.value.selectedDepartment) return []
  return props.employees
    .filter((e) => e.department === form.value.selectedDepartment)
    .map((e) => e.name)
})

// 선택된 직원
const selectedEmployee = computed(() =>
  props.employees.find(
    (e) =>
      e.name === form.value.selectedEmployeeName &&
      e.department === form.value.selectedDepartment,
  ) ?? null,
)

const remainingAfter = computed(() => {
  if (!selectedEmployee.value) return null
  if (!deductsAnnualLeave(form.value.leaveType)) {
    return selectedEmployee.value.remainingAnnualLeaveCount
  }
  return Math.max(
    0,
    selectedEmployee.value.remainingAnnualLeaveCount - (Number(form.value.daysCount) || 0),
  )
})

const isHomeLeave = computed(() => isHomeLeaveType(form.value.leaveType))

const homeLeaveEligibility = computed(() =>
  resolveHomeLeaveEligibility({
    employee: selectedEmployee.value,
    requests: homeLeaveRequests.value,
    startDate: form.value.startDate,
    excludeRequestId: props.excludeRequestId,
  }),
)

const selectedHomeLeaveDuration = computed(() =>
  getHomeLeaveDurationFromReason(form.value.reason),
)

const generalReasons = computed(() =>
  LEAVE_REASONS.filter((r) => r !== HOME_LEAVE_REASON && r !== HOME_LEAVE_REASON_WEDDING),
)

function emitUpdate(next: AttendanceFormState) {
  form.value = next
  emit('update:modelValue', next)
}

async function loadHomeLeaveHistory() {
  const name = form.value.selectedEmployeeName
  const department = form.value.selectedDepartment
  if (!name || !department) {
    homeLeaveRequests.value = []
    return
  }

  homeLeaveLoading.value = true
  try {
    homeLeaveRequests.value = await fetchEmployeeHomeLeaveRequests(name, department)
  } catch {
    homeLeaveRequests.value = []
  } finally {
    homeLeaveLoading.value = false
  }
}

watch(
  () => [form.value.selectedEmployeeName, form.value.selectedDepartment] as const,
  () => {
    void loadHomeLeaveHistory()
  },
  { immediate: true },
)

// 부서 변경 → 이름 초기화
function onDeptChange(dept: string) {
  emitUpdate({ ...form.value, selectedDepartment: dept, selectedEmployeeName: '' })
}

// 이름 선택
function onNameChange(name: string) {
  emitUpdate({ ...form.value, selectedEmployeeName: name })
}

// 휴가 종류 선택
const isSingleDay = computed(() => isSingleDayLeaveType(form.value.leaveType))
const isEndDateLocked = computed(() => isSingleDay.value || isHomeLeave.value)

const durationHint = computed(() => getLeaveDurationHint(form.value.leaveType))

const daysCountLabel = computed(() =>
  formatLeaveDaysCountLabel(form.value.leaveType, form.value.daysCount, form.value.reason),
)

function calcDays(start: string, end: string): number {
  if (!start || !end) return 1
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 1
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

function buildHomeLeaveDates(
  startDate: string,
  duration: HomeLeaveDuration,
): Pick<AttendanceFormState, 'startDate' | 'endDate' | 'daysCount' | 'reason'> {
  const months = getHomeLeaveMonths(duration)
  const endDate = calcHomeLeaveEndDate(startDate, months)
  return {
    startDate,
    endDate,
    daysCount: calcDays(startDate, endDate),
    reason: getHomeLeaveReasonForDuration(duration),
  }
}

function resolveReasonForType(type: LeaveType, currentReason: string): string {
  if (isHomeLeaveType(type)) {
    return currentReason === HOME_LEAVE_REASON_WEDDING
      ? HOME_LEAVE_REASON_WEDDING
      : HOME_LEAVE_REASON
  }
  if (currentReason === HOME_LEAVE_REASON || currentReason === HOME_LEAVE_REASON_WEDDING) {
    return generalReasons.value[0] ?? '병원'
  }
  return currentReason
}

function selectType(type: LeaveType) {
  if (isHomeLeaveType(type)) {
    const duration =
      selectedHomeLeaveDuration.value === HOME_LEAVE_DURATION_2M_WEDDING &&
      homeLeaveEligibility.value.canSelectWedding
        ? HOME_LEAVE_DURATION_2M_WEDDING
        : HOME_LEAVE_DURATION_1M
    const nextEligible = homeLeaveEligibility.value.nextEligibleDate
    const startDate =
      nextEligible && form.value.startDate < nextEligible
        ? nextEligible
        : form.value.startDate
    emitUpdate({
      ...form.value,
      leaveType: type,
      ...buildHomeLeaveDates(startDate, duration),
    })
    return
  }

  const fixedDays = getFixedLeaveDaysCount(type)
  emitUpdate({
    ...form.value,
    leaveType: type,
    reason: resolveReasonForType(type, form.value.reason),
    daysCount: fixedDays ?? calcDays(form.value.startDate, form.value.endDate),
    endDate: isSingleDayLeaveType(type) ? form.value.startDate : form.value.endDate,
  })
}

function selectHomeLeaveDuration(duration: HomeLeaveDuration) {
  if (duration === HOME_LEAVE_DURATION_1M && !homeLeaveEligibility.value.canSelectOneMonth) return
  if (duration === HOME_LEAVE_DURATION_2M_WEDDING && !homeLeaveEligibility.value.canSelectWedding) return
  emitUpdate({
    ...form.value,
    leaveType: '귀국휴가',
    ...buildHomeLeaveDates(form.value.startDate, duration),
  })
}

const cannotSubmitForLeaveBalance = computed(() => {
  if (!props.hideEmployeeSelector || !selectedEmployee.value) return false
  if (!deductsAnnualLeave(form.value.leaveType)) return false
  return selectedEmployee.value.remainingAnnualLeaveCount === 0
})

const cannotSubmitForHomeLeave = computed(() => {
  if (!isHomeLeave.value) return false
  if (!homeLeaveEligibility.value.canApply) return true
  if (
    selectedHomeLeaveDuration.value === HOME_LEAVE_DURATION_2M_WEDDING &&
    homeLeaveEligibility.value.weddingUsed
  ) {
    return true
  }
  return false
})

const homeLeaveMinStart = computed(() => homeLeaveEligibility.value.nextEligibleDate ?? undefined)

const todayYmd = new Date().toISOString().slice(0, 10)
const showHomeLeaveCooldownHint = computed(() => {
  const next = homeLeaveEligibility.value.nextEligibleDate
  return Boolean(selectedEmployee.value && next && next > todayYmd)
})

function onStartDateChange(date: string) {
  if (isHomeLeave.value) {
    const nextEligible = homeLeaveEligibility.value.nextEligibleDate
    const startDate = nextEligible && date < nextEligible ? nextEligible : date
    emitUpdate({
      ...form.value,
      ...buildHomeLeaveDates(startDate, selectedHomeLeaveDuration.value),
    })
    return
  }

  const fixedDays = getFixedLeaveDaysCount(form.value.leaveType)
  const endDate = isSingleDay.value
    ? date
    : form.value.endDate < date ? date : form.value.endDate
  emitUpdate({
    ...form.value,
    startDate: date,
    endDate,
    daysCount: fixedDays ?? calcDays(date, endDate),
  })
}

function onEndDateChange(date: string) {
  if (isEndDateLocked.value) return
  emitUpdate({ ...form.value, endDate: date, daysCount: calcDays(form.value.startDate, date) })
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="emit('submit')">

    <!-- 본인 연차 정보 (키패드 인증 후) -->
    <div
      v-if="hideEmployeeSelector && selectedEmployee"
      class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-bold text-emerald-600">{{ selectedEmployee.department }}</p>
          <p class="mt-0.5 text-lg font-extrabold text-slate-900">{{ selectedEmployee.name }}</p>
        </div>
        <div class="text-right">
          <p class="text-[11px] font-bold text-emerald-600">잔여 연차</p>
          <p class="mt-0.5 text-2xl font-extrabold text-emerald-700">
            {{ selectedEmployee.remainingAnnualLeaveCount }}<span class="ml-0.5 text-sm">일</span>
          </p>
        </div>
      </div>
      <div class="mt-3 grid grid-cols-2 gap-2 border-t border-emerald-200 pt-3 text-center text-xs">
        <div>
          <p class="font-bold text-emerald-600">신청 일수</p>
          <p class="mt-0.5 text-base font-extrabold text-slate-800">{{ daysCountLabel }}</p>
        </div>
        <div>
          <p class="font-bold text-emerald-600">신청 후 잔여</p>
          <p
            class="mt-0.5 text-base font-extrabold"
            :class="(remainingAfter ?? 0) <= 0 ? 'text-red-500' : 'text-slate-800'"
          >
            {{ remainingAfter }}일
          </p>
        </div>
      </div>
      <p
        v-if="cannotSubmitForLeaveBalance"
        class="mt-3 rounded-lg border border-red-200 bg-red-50 py-2 text-center text-xs font-extrabold text-red-600"
      >
        잔여 연차가 없어 신청할 수 없습니다. 인사담당자에게 문의하세요.
      </p>
      <button
        type="button"
        class="mt-4 w-full rounded-xl bg-emerald-600 py-3.5 text-base font-extrabold text-white transition-colors hover:bg-emerald-500"
        @click="emit('viewHistory', { name: selectedEmployee.name, department: selectedEmployee.department })"
      >
        신청현황 보기
      </button>
    </div>

    <!-- 부서 선택 -->
    <div v-if="!hideEmployeeSelector" class="grid grid-cols-2 gap-4">
      <div>
        <label class="mb-1.5 block text-sm font-bold text-slate-700">부서</label>
        <select
          :value="form.selectedDepartment"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
          @change="onDeptChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="">부서 선택</option>
          <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-bold text-slate-700">이름</label>
        <select
          :value="form.selectedEmployeeName"
          :disabled="!form.selectedDepartment"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
          @change="onNameChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="">이름 선택</option>
          <option v-for="name in employeeNames" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>
    </div>

    <!-- 휴가 종류 -->
    <div>
      <label class="mb-1.5 block text-sm font-bold text-slate-700">휴가 종류</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="type in LEAVE_TYPES"
          :key="type"
          type="button"
          class="rounded-full px-4 py-2 text-sm font-bold transition-colors"
          :class="
            form.leaveType === type
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          "
          @click="selectType(type as LeaveType)"
        >
          {{ type }}
        </button>
      </div>
      <p
        v-if="showHomeLeaveCooldownHint && homeLeaveEligibility.nextEligibleDate"
        class="mt-2 text-xs font-bold text-indigo-600"
      >
        귀국휴가 {{ formatHomeLeaveEligibleDate(homeLeaveEligibility.nextEligibleDate) }} 이후
      </p>
    </div>

    <!-- 귀국휴가 기간 -->
    <div v-if="isHomeLeave">
      <label class="mb-1.5 block text-sm font-bold text-slate-700">귀국휴가 기간</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="duration in HOME_LEAVE_DURATIONS"
          :key="duration"
          type="button"
          class="rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="
            duration === HOME_LEAVE_DURATION_1M
              ? !homeLeaveEligibility.canSelectOneMonth
              : !homeLeaveEligibility.canSelectWedding
          "
          :class="
            selectedHomeLeaveDuration === duration
              ? 'bg-indigo-700 text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          "
          @click="selectHomeLeaveDuration(duration)"
        >
          {{ duration }}
        </button>
      </div>
      <p
        v-if="homeLeaveEligibility.weddingUsed"
        class="mt-2 text-xs font-bold text-slate-500"
      >
        결혼식 사용완료
      </p>
    </div>

    <!-- 날짜 -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="mb-1.5 block text-sm font-bold text-slate-700">시작일</label>
        <input
          :value="form.startDate"
          type="date"
          :min="isHomeLeave ? homeLeaveMinStart : undefined"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
          @change="onStartDateChange(($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-bold text-slate-700">종료일</label>
        <input
          :value="form.endDate"
          type="date"
          :min="form.startDate"
          :disabled="isEndDateLocked"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
          @change="onEndDateChange(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- 신청 일수 -->
    <div>
      <label class="mb-1.5 block text-sm font-bold text-slate-700">신청 일수</label>
      <div class="flex items-center gap-2">
        <span class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">
          {{ daysCountLabel }}
        </span>
        <span v-if="durationHint" class="text-xs text-slate-400">{{ durationHint }}</span>
      </div>
    </div>

    <!-- 사유 -->
    <div v-if="!isHomeLeave">
      <label class="mb-1.5 block text-sm font-bold text-slate-700">사유</label>
      <select
        :value="form.reason"
        class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
        @change="emitUpdate({ ...form, reason: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="r in generalReasons" :key="r" :value="r">{{ r }}</option>
      </select>
    </div>

    <!-- 증빙 사진 -->
    <AttendanceEvidencePicker
      :model-value="form.evidenceUrls ?? []"
      :user-id="uploadUserId || ''"
      :disabled="loading"
      @update:model-value="emitUpdate({ ...form, evidenceUrls: $event })"
    />

    <!-- 버튼 -->
    <div class="flex justify-end gap-3">
      <button
        type="button"
        class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
        :disabled="loading"
        @click="emit('cancel')"
      >취소</button>
      <button
        type="submit"
        class="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"
        :disabled="loading || cannotSubmitForLeaveBalance || cannotSubmitForHomeLeave || homeLeaveLoading"
      >
        {{ loading ? '처리 중...' : isEdit ? '수정' : '신청' }}
      </button>
    </div>
  </form>
</template>
