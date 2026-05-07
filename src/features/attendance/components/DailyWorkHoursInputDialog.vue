<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { WORK_END_TIME_OPTIONS, type Employee, type DailyWorkHour, type WorkEndTime } from '../types/attendance'
import {
  DAILY_WORK_DEPARTMENT_ORDER,
  getDailyWorkDepartmentRank,
  normalizeDailyWorkDepartment,
} from '../utils/dailyWorkDepartment'

const props = defineProps<{
  employees: Employee[]
  todayHours: DailyWorkHour[]
  workDate: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', records: { employeeId: number; endTime: string }[]): void
}>()

const PRODUCTION_DEPARTMENTS = new Set(['메인관', '가지관', '나사'])

// 담당부서 (assigned_department) 목록
const assignedDepartments = computed(() => {
  const set = new Set(props.employees.map((e) => normalizeDailyWorkDepartment(e.assignedDepartment)))
  return DAILY_WORK_DEPARTMENT_ORDER.filter((d) => set.has(d))
})

// 1단계: 담당부서 선택 ('전체' 또는 특정 부서)
const selectedDept = ref<string>('') // '' = 미선택, '__ALL__' = 전체

// 2단계: 직원별 시간 선택 (Map<employeeId, endTime>)
const selections = ref<Map<number, string>>(new Map())
const productionPresetTime = ref<string>('')

// 일괄 적용용 시간
const bulkTime = ref<WorkEndTime>('17:00')

const productionEmployees = computed(() => {
  return props.employees.filter((employee) => PRODUCTION_DEPARTMENTS.has(normalizeDailyWorkDepartment(employee.assignedDepartment)))
})

// 표시할 직원 목록
const visibleEmployees = computed(() => {
  if (!selectedDept.value) return []
  const list = selectedDept.value === '__ALL__'
    ? props.employees
    : selectedDept.value === '__PRODUCTION__'
      ? productionEmployees.value
      : props.employees.filter((e) => normalizeDailyWorkDepartment(e.assignedDepartment) === selectedDept.value)
  return list.slice().sort((a, b) => {
    const d = getDailyWorkDepartmentRank(a.assignedDepartment) -
              getDailyWorkDepartmentRank(b.assignedDepartment)
    if (d !== 0) return d
    return a.name.localeCompare(b.name, 'ko')
  })
})

// 부서 선택 시 기존 저장값으로 selections 초기화
watch(selectedDept, () => {
  const next = new Map<number, string>()
  for (const emp of visibleEmployees.value) {
    const existing = props.todayHours.find((h) => h.employeeId === emp.id)
    if (productionPresetTime.value && selectedDept.value === '__PRODUCTION__') {
      next.set(emp.id, productionPresetTime.value)
    } else if (existing) {
      next.set(emp.id, existing.endTime)
    }
  }
  selections.value = next
})

function applyProductionPreset(time: string) {
  productionPresetTime.value = time
  selectedDept.value = '__PRODUCTION__'
  const next = new Map<number, string>()
  for (const emp of productionEmployees.value) {
    next.set(emp.id, time)
  }
  selections.value = next
}

function pickTime(empId: number, time: string) {
  const next = new Map(selections.value)
  if (next.get(empId) === time) {
    next.delete(empId) // 같은 거 다시 누르면 해제
  } else {
    next.set(empId, time)
  }
  selections.value = next
}

function applyAll() {
  const next = new Map(selections.value)
  for (const emp of visibleEmployees.value) {
    next.set(emp.id, bulkTime.value)
  }
  selections.value = next
}

function clearAll() {
  selections.value = new Map()
}

function back() {
  selectedDept.value = ''
  selections.value = new Map()
  productionPresetTime.value = ''
}

const selectedCount = computed(() => {
  let n = 0
  for (const emp of visibleEmployees.value) {
    if (selections.value.has(emp.id)) n++
  }
  return n
})

function handleSave() {
  const records: { employeeId: number; endTime: string }[] = []
  for (const emp of visibleEmployees.value) {
    const time = selections.value.get(emp.id)
    if (time) records.push({ employeeId: emp.id, endTime: time })
  }
  emit('save', records)
}

const labelOfTime = (v: string) => WORK_END_TIME_OPTIONS.find((o) => o.value === v)?.label ?? v
const selectedDeptLabel = computed(() => {
  if (selectedDept.value === '__ALL__') return '전체'
  if (selectedDept.value === '__PRODUCTION__') return '생산'
  return selectedDept.value
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div class="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        <!-- 헤더 -->
        <div class="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 class="text-lg font-extrabold text-slate-900">근무시간 입력</h2>
            <p class="mt-0.5 text-sm text-slate-500">{{ workDate }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            @click="emit('close')"
          >✕</button>
        </div>

        <!-- 본문: 담당부서 선택 단계 -->
        <div v-if="!selectedDept" class="p-5 overflow-y-auto">
          <p class="mb-3 text-sm font-bold text-slate-700">생산 일괄 적용</p>
          <div class="mb-5 grid grid-cols-3 gap-2">
            <button
              v-for="opt in WORK_END_TIME_OPTIONS"
              :key="opt.value"
              type="button"
              class="rounded-xl bg-emerald-600 px-3 py-3 text-sm font-extrabold text-white hover:bg-emerald-500"
              @click="applyProductionPreset(opt.value)"
            >생산 {{ opt.label }}</button>
          </div>

          <p class="mb-3 text-sm font-bold text-slate-700">담당부서 선택</p>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              type="button"
              class="rounded-2xl border border-slate-300 bg-slate-900 px-4 py-6 text-base font-extrabold text-white hover:bg-slate-700"
              @click="selectedDept = '__ALL__'"
            >전체</button>
            <button
              v-for="d in assignedDepartments"
              :key="d"
              type="button"
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-base font-extrabold text-slate-800 hover:bg-slate-200"
              @click="selectedDept = d"
            >{{ d }}</button>
          </div>
        </div>

        <!-- 본문: 직원 시간 선택 단계 -->
        <div v-else class="flex-1 overflow-y-auto p-5">
          <!-- 일괄 적용 바 -->
          <div class="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-600">일괄 적용:</span>
                <div class="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
                  <button
                    v-for="opt in WORK_END_TIME_OPTIONS"
                    :key="opt.value"
                    type="button"
                    class="rounded-md px-2.5 py-1 text-xs font-bold transition-colors"
                    :class="bulkTime === opt.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
                    @click="bulkTime = opt.value"
                  >{{ opt.label }}</button>
                </div>
                <button
                  type="button"
                  class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-500"
                  @click="applyAll"
                >전체 적용</button>
              </div>
              <button
                type="button"
                class="text-xs font-bold text-slate-400 hover:text-slate-600"
                @click="clearAll"
              >전체 해제</button>
            </div>
          </div>

          <p v-if="visibleEmployees.length === 0" class="py-12 text-center text-sm text-slate-400">
            해당 부서에 등록된 직원이 없습니다.
          </p>

          <!-- 직원별 시간 선택 -->
          <div v-else class="space-y-2">
            <div
              v-for="emp in visibleEmployees"
              :key="emp.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              :class="selections.has(emp.id) ? 'border-emerald-300 bg-emerald-50' : ''"
            >
              <div class="flex min-w-0 items-center gap-2">
                <span class="font-extrabold text-slate-900">{{ emp.name }}</span>
                <span class="text-[11px] font-bold text-slate-400">{{ normalizeDailyWorkDepartment(emp.assignedDepartment || emp.department) }}</span>
              </div>
              <div class="flex gap-1">
                <button
                  v-for="opt in WORK_END_TIME_OPTIONS"
                  :key="opt.value"
                  type="button"
                  class="rounded-lg border px-3 py-1 text-xs font-bold transition-colors"
                  :class="selections.get(emp.id) === opt.value
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                  @click="pickTime(emp.id, opt.value)"
                >{{ opt.label }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 푸터 -->
        <div class="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <div class="text-xs font-bold text-slate-500">
            <template v-if="selectedDept">{{ selectedDeptLabel }} 선택됨 {{ selectedCount }} / {{ visibleEmployees.length }}명</template>
          </div>
          <div class="flex gap-2">
            <button
              v-if="selectedDept"
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
              @click="back"
            >← 부서 다시 선택</button>
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
              @click="emit('close')"
            >취소</button>
            <button
              v-if="selectedDept"
              type="button"
              class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-extrabold text-white hover:bg-slate-700 disabled:opacity-40"
              :disabled="selectedCount === 0"
              @click="handleSave"
            >저장</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
