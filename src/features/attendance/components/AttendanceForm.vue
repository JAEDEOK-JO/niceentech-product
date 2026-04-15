<script setup lang="ts">
import { ref, computed } from 'vue'
import { LEAVE_TYPES, LEAVE_REASONS, type AttendanceFormState, type LeaveType, type Employee } from '../types/attendance'

const props = defineProps<{
  modelValue: AttendanceFormState
  loading: boolean
  isEdit: boolean
  employees: Employee[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AttendanceFormState): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const form = ref<AttendanceFormState>({ ...props.modelValue })

// 부서 목록 (employees에서 추출, 고정 순서)
const DEPT_ORDER = ['생산부', '용접부', '나사부', 'CNC']
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

function emitUpdate(next: AttendanceFormState) {
  form.value = next
  emit('update:modelValue', next)
}

// 부서 변경 → 이름 초기화
function onDeptChange(dept: string) {
  emitUpdate({ ...form.value, selectedDepartment: dept, selectedEmployeeName: '' })
}

// 이름 선택
function onNameChange(name: string) {
  emitUpdate({ ...form.value, selectedEmployeeName: name })
}

// 휴가 종류 선택
const isHalfDay = computed(
  () => form.value.leaveType === '반차(오전)' || form.value.leaveType === '반차(오후)',
)

function calcDays(start: string, end: string): number {
  if (!start || !end) return 1
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 1
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

function selectType(type: LeaveType) {
  const half = type === '반차(오전)' || type === '반차(오후)'
  emitUpdate({
    ...form.value,
    leaveType: type,
    daysCount: half ? 0.5 : calcDays(form.value.startDate, form.value.endDate),
    endDate: half ? form.value.startDate : form.value.endDate,
  })
}

function onStartDateChange(date: string) {
  const endDate = isHalfDay.value
    ? date
    : form.value.endDate < date ? date : form.value.endDate
  emitUpdate({
    ...form.value,
    startDate: date,
    endDate,
    daysCount: isHalfDay.value ? 0.5 : calcDays(date, endDate),
  })
}

function onEndDateChange(date: string) {
  emitUpdate({ ...form.value, endDate: date, daysCount: calcDays(form.value.startDate, date) })
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="emit('submit')">

    <!-- 부서 선택 -->
    <div class="grid grid-cols-2 gap-4">
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
    </div>

    <!-- 날짜 -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="mb-1.5 block text-sm font-bold text-slate-700">시작일</label>
        <input
          :value="form.startDate"
          type="date"
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
          :disabled="isHalfDay"
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
          {{ form.daysCount }}일
        </span>
        <span v-if="isHalfDay" class="text-xs text-slate-400">반차: 0.5일 고정</span>
      </div>
    </div>

    <!-- 사유 -->
    <div>
      <label class="mb-1.5 block text-sm font-bold text-slate-700">사유</label>
      <select
        :value="form.reason"
        class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
        @change="emitUpdate({ ...form, reason: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="r in LEAVE_REASONS" :key="r" :value="r">{{ r }}</option>
      </select>
    </div>

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
        :disabled="loading"
      >
        {{ loading ? '처리 중...' : isEdit ? '수정' : '신청' }}
      </button>
    </div>
  </form>
</template>
