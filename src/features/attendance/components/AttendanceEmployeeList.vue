<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDialog } from '@/composables/useDialog'
import type { Employee } from '../types/attendance'
import type { EmployeeFormData } from '../services/attendance.service'
import {
  getDefaultPasswordForDepartment,
  PRODUCTION_DEPARTMENT,
  PRODUCTION_DEPARTMENT_PASSWORD,
} from '../utils/employeePassword'
import {
  DEFAULT_EMPLOYEE_OPTIONS,
  fetchEmployeeOptionGroups,
  type EmployeeOptionGroups,
} from '../services/employeeOptions.service'

const { confirm } = useDialog()

const props = defineProps<{
  employees: Employee[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'create', data: EmployeeFormData): void
  (e: 'update', payload: { id: number; data: EmployeeFormData }): void
  (e: 'delete', id: number): void
}>()

// ─── 검색/필터 ─────────────────────────────────────────────────────────────────
const searchQuery = ref('')
const filterDept = ref('')
const filterFull = ref<'all' | 'full' | 'part'>('all')

const departments = computed(() => {
  const depts = [...new Set(props.employees.map((e) => e.department).filter(Boolean))]
  return depts.sort()
})

const filtered = computed(() =>
  props.employees
    .filter((emp) => {
      if (filterDept.value && emp.department !== filterDept.value) return false
      if (filterFull.value === 'full' && !emp.isFullTime) return false
      if (filterFull.value === 'part' && emp.isFullTime) return false
      if (searchQuery.value) {
        const q = searchQuery.value.trim().toLowerCase()
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.role.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      const d1 = (departmentOrder.value.get(a.department) ?? 99) - (departmentOrder.value.get(b.department) ?? 99)
      if (d1 !== 0) return d1
      const d2 = (assignedDepartmentOrder.value.get(a.assignedDepartment) ?? 99) - (assignedDepartmentOrder.value.get(b.assignedDepartment) ?? 99)
      if (d2 !== 0) return d2
      return (a.isFullTime === b.isFullTime ? 0 : a.isFullTime ? -1 : 1)
    }),
)

// ─── 폼 상태 ───────────────────────────────────────────────────────────────────
const formVisible = ref(false)
const isEditMode = ref(false)
const editTargetId = ref<number | null>(null)

const ROLES = ['반장', '작업자'] as const
const optionGroups = ref<EmployeeOptionGroups>(DEFAULT_EMPLOYEE_OPTIONS)

const departmentOptions = computed(() => optionGroups.value.departments)
const assignedDepartmentOptions = computed(() => optionGroups.value.assignedDepartments)
const nationalityOptions = computed(() => optionGroups.value.nationalities)
const departmentOrder = computed(() => new Map(departmentOptions.value.map((value, index) => [value, index])))
const assignedDepartmentOrder = computed(() => new Map(assignedDepartmentOptions.value.map((value, index) => [value, index])))

const withCurrentOption = (options: string[], current: string) => {
  const value = String(current ?? '').trim()
  if (!value || options.includes(value)) return options
  return [...options, value]
}

async function loadEmployeeOptions() {
  try {
    optionGroups.value = await fetchEmployeeOptionGroups()
  } catch {
    optionGroups.value = DEFAULT_EMPLOYEE_OPTIONS
  }
}

const emptyForm = (): EmployeeFormData => ({
  employeeCode: '',
  name: '',
  department: departmentOptions.value[0] ?? '',
  assignedDepartment: '',
  remainingAnnualLeaveCount: 10,
  hourlyWage: 10000,
  isFullTime: true,
  nationality: nationalityOptions.value[0] ?? '',
  role: '작업자',
  hireDate: '',
  homeLeaveStart: '',
  homeLeaveEnd: '',
  password: getDefaultPasswordForDepartment(departmentOptions.value[0] ?? ''),
})

const isValidEmployeeCode = (code: string) => /^\d{8}$/.test(code.trim())

const form = ref<EmployeeFormData>(emptyForm())

watch(
  () => form.value.department,
  (department) => {
    if (department === PRODUCTION_DEPARTMENT) {
      form.value.password = PRODUCTION_DEPARTMENT_PASSWORD
    }
  },
)

function openCreate() {
  form.value = emptyForm()
  isEditMode.value = false
  editTargetId.value = null
  formVisible.value = true
}

function openEdit(emp: Employee) {
  form.value = {
    employeeCode: emp.employeeCode,
    name: emp.name,
    department: emp.department,
    assignedDepartment: emp.assignedDepartment,
    remainingAnnualLeaveCount: emp.remainingAnnualLeaveCount,
    hourlyWage: emp.hourlyWage,
    isFullTime: emp.isFullTime,
    nationality: emp.nationality,
    role: emp.role,
    hireDate: emp.hireDate ?? '',
    homeLeaveStart: emp.homeLeaveStart ?? '',
    homeLeaveEnd: emp.homeLeaveEnd ?? '',
    password: emp.password,
  }
  isEditMode.value = true
  editTargetId.value = emp.id
  formVisible.value = true
}

function closeForm() {
  formVisible.value = false
}

function submitForm() {
  if (!form.value.name.trim()) return
  const trimmedCode = form.value.employeeCode.trim()
  if (trimmedCode && !isValidEmployeeCode(trimmedCode)) return
  const normalizedHourlyWage = Math.min(
    15000,
    Math.max(10000, Math.round(Number(form.value.hourlyWage || 10000) / 100) * 100),
  )
  const normalizedAnnualLeaveCount = Math.max(
    0,
    Math.floor(Number(form.value.remainingAnnualLeaveCount || 0)),
  )
  const normalizedPassword = Math.max(0, Math.floor(Number(form.value.password || 0)))
  const payload: EmployeeFormData = {
    ...form.value,
    employeeCode: trimmedCode,
    hourlyWage: normalizedHourlyWage,
    remainingAnnualLeaveCount: normalizedAnnualLeaveCount,
    password: normalizedPassword,
  }
  if (isEditMode.value && editTargetId.value !== null) {
    emit('update', { id: editTargetId.value, data: payload })
  } else {
    emit('create', payload)
  }
  formVisible.value = false
}

async function handleDelete(emp: Employee) {
  if (!await confirm(`'${emp.name}' 직원을 삭제하시겠습니까?`)) return
  emit('delete', emp.id)
}

const fmt = (d: string | null) => (d ? d.slice(0, 10) : null)

const homeLeaveLabel = (emp: Employee) => {
  const s = fmt(emp.homeLeaveStart)
  const e = fmt(emp.homeLeaveEnd)
  if (s && e) return `${s} ~ ${e}`
  if (s) return `${s} ~`
  return null
}

const nationalityClass = (n: string) => {
  if (n === '한국') return 'bg-blue-100 text-blue-700'
  if (n === '중국') return 'bg-red-100 text-red-700'
  if (n === '태국') return 'bg-emerald-100 text-emerald-700'
  if (n === '러시아') return 'bg-violet-100 text-violet-700'
  if (n === '파키스탄') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

onMounted(loadEmployeeOptions)
</script>

<template>
  <div>
    <!-- 툴바 -->
    <div class="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
      <div class="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="이름 / 역할 / ID 검색"
          class="col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none md:col-span-1"
        />
        <select
          v-model="filterDept"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
        >
          <option value="">전체 부서</option>
          <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
        </select>
        <select
          v-model="filterFull"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
        >
          <option value="all">전체</option>
          <option value="full">정직원</option>
          <option value="part">계약직</option>
        </select>
      </div>
      <button
        type="button"
        class="w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700 md:w-auto"
        @click="openCreate"
      >
        + 직원 등록
      </button>
    </div>

    <!-- 로딩 -->
    <div v-if="loading" class="py-16 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
    </div>

    <template v-else>
      <!-- 모바일 카드 목록 -->
      <div class="space-y-2 md:hidden">
        <div v-if="filtered.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
          등록된 직원이 없습니다.
        </div>
        <template v-else>
          <div
            v-for="emp in filtered"
            :key="emp.id"
            class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <p class="truncate text-base font-extrabold text-slate-900">{{ emp.name }}</p>
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] font-extrabold"
                    :class="emp.isFullTime ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-700'"
                  >{{ emp.isFullTime ? '정직원' : '계약직' }}</span>
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="nationalityClass(emp.nationality)">
                    {{ emp.nationality }}
                  </span>
                </div>
                <p class="mt-1 text-xs font-bold text-slate-500">{{ emp.employeeCode || 'ID 없음' }}</p>
              </div>
              <div class="flex shrink-0 gap-1">
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600"
                  @click="openEdit(emp)"
                >수정</button>
                <button
                  type="button"
                  class="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-500"
                  @click="handleDelete(emp)"
                >삭제</button>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div class="rounded-lg bg-slate-50 px-2.5 py-2">
                <p class="font-bold text-slate-400">부서</p>
                <p class="mt-0.5 font-extrabold text-slate-800">{{ emp.department || '-' }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 px-2.5 py-2">
                <p class="font-bold text-slate-400">담당부서</p>
                <p class="mt-0.5 font-extrabold text-slate-800">{{ emp.assignedDepartment || '-' }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 px-2.5 py-2">
                <p class="font-bold text-slate-400">연차</p>
                <p class="mt-0.5 font-extrabold text-slate-800">{{ emp.remainingAnnualLeaveCount }}회</p>
              </div>
            </div>

            <div v-if="homeLeaveLabel(emp)" class="mt-2 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-extrabold text-blue-700">
              귀국휴가 {{ homeLeaveLabel(emp) }}
            </div>
          </div>
        </template>
      </div>

      <!-- 테이블 -->
      <div class="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50">
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">ID</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">이름</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">부서</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">담당부서</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">남은연차</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">역할</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">구분</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">국적</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">입사일</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">귀국휴가</th>
            <th class="px-4 py-3 text-center font-bold text-slate-600">액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="11" class="py-12 text-center text-sm text-slate-400">등록된 직원이 없습니다.</td>
          </tr>
          <tr
            v-for="emp in filtered"
            :key="emp.id"
            class="border-b border-slate-200 last:border-0 hover:bg-slate-50"
          >
            <td class="border-r border-slate-200 px-4 py-3 text-center font-mono text-slate-700">{{ emp.employeeCode || '-' }}</td>
            <td class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-900">{{ emp.name }}</td>
            <td class="border-r border-slate-200 px-4 py-3 text-center text-slate-700">{{ emp.department || '-' }}</td>
            <td class="border-r border-slate-200 px-4 py-3 text-center text-slate-700">{{ emp.assignedDepartment || '-' }}</td>
            <td class="border-r border-slate-200 px-4 py-3 text-center text-slate-700">{{ emp.remainingAnnualLeaveCount }}회</td>
            <td class="border-r border-slate-200 px-4 py-3 text-center text-slate-700">{{ emp.role || '-' }}</td>
            <td class="border-r border-slate-200 px-4 py-3 text-center">
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                :class="emp.isFullTime ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
              >{{ emp.isFullTime ? '정직원' : '계약직' }}</span>
            </td>
            <td class="border-r border-slate-200 px-4 py-3 text-center">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="nationalityClass(emp.nationality)">
                {{ emp.nationality }}
              </span>
            </td>
            <td class="border-r border-slate-200 whitespace-nowrap px-4 py-3 text-center text-slate-600">{{ fmt(emp.hireDate) ?? '-' }}</td>
            <td class="border-r border-slate-200 whitespace-nowrap px-4 py-3 text-center font-medium text-blue-600">{{ homeLeaveLabel(emp) ?? '-' }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  @click="openEdit(emp)"
                >수정</button>
                <button
                  type="button"
                  class="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-500 hover:bg-red-50"
                  @click="handleDelete(emp)"
                >삭제</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    </template>

    <!-- 직원 등록/수정 모달 -->
    <Teleport to="body">
      <div
        v-if="formVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        @click.self="closeForm"
      >
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h2 class="mb-5 text-lg font-extrabold text-slate-900">
            {{ isEditMode ? '직원 정보 수정' : '직원 등록' }}
          </h2>
          <form class="space-y-4" @submit.prevent="submitForm">

            <!-- ID -->
            <div>
              <label class="mb-1 block text-xs font-bold text-slate-600">ID (8자리 숫자)</label>
              <input
                v-model="form.employeeCode"
                type="text"
                inputmode="numeric"
                maxlength="8"
                placeholder="00000085"
                class="w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                :class="form.employeeCode && !isValidEmployeeCode(form.employeeCode.trim()) ? 'border-red-300' : 'border-slate-200'"
                @input="form.employeeCode = form.employeeCode.replace(/\D/g, '').slice(0, 8)"
              />
              <p v-if="form.employeeCode && !isValidEmployeeCode(form.employeeCode.trim())" class="mt-1 text-xs text-red-500">
                숫자 8자리로 입력해주세요.
              </p>
            </div>

            <!-- 이름 + 부서 -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-bold text-slate-600">이름 *</label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="홍길동"
                  required
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-bold text-slate-600">부서</label>
                <select
                  v-model="form.department"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option v-for="d in withCurrentOption(departmentOptions, form.department)" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
            </div>

            <!-- 역할 + 국적 -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-bold text-slate-600">남은연차</label>
                <input
                  v-model.number="form.remainingAnnualLeaveCount"
                  type="number"
                  min="0"
                  step="1"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-bold text-slate-600">시급(원)</label>
                <input
                  v-model.number="form.hourlyWage"
                  type="number"
                  min="10000"
                  max="15000"
                  step="100"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-bold text-slate-600">역할</label>
                <select
                  v-model="form.role"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs font-bold text-slate-600">국적</label>
                <select
                  v-model="form.nationality"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option v-for="n in withCurrentOption(nationalityOptions, form.nationality)" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>
            </div>

            <!-- 담당부서 -->
            <div>
              <label class="mb-1 block text-xs font-bold text-slate-600">담당부서</label>
              <select
                v-model="form.assignedDepartment"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">선택 안함</option>
                <option v-for="d in withCurrentOption(assignedDepartmentOptions, form.assignedDepartment)" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>

            <!-- 입사일 + 비밀번호 -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-bold text-slate-600">입사일</label>
                <input
                  v-model="form.hireDate"
                  type="date"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-bold text-slate-600">비밀번호 (숫자)</label>
                <input
                  v-model.number="form.password"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  placeholder="0"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                  :disabled="form.department === PRODUCTION_DEPARTMENT"
                />
              </div>
            </div>

            <!-- 귀국휴가 기간 -->
            <div>
              <label class="mb-1.5 block text-xs font-bold text-slate-600">귀국휴가 기간</label>
              <div class="flex items-center gap-2">
                <input
                  v-model="form.homeLeaveStart"
                  type="date"
                  class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <span class="shrink-0 text-sm font-bold text-slate-400">~</span>
                <input
                  v-model="form.homeLeaveEnd"
                  type="date"
                  :min="form.homeLeaveStart || undefined"
                  class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            <!-- 정직원 여부 토글 -->
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                :class="form.isFullTime ? 'bg-slate-900' : 'bg-slate-200'"
                @click="form.isFullTime = !form.isFullTime"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200"
                  :class="form.isFullTime ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
              <span class="text-sm font-bold text-slate-700">
                {{ form.isFullTime ? '정직원' : '계약직' }}
              </span>
            </div>

            <!-- 버튼 -->
            <div class="flex justify-end gap-3 pt-1">
              <button
                type="button"
                class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                @click="closeForm"
              >취소</button>
              <button
                type="submit"
                class="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
              >{{ isEditMode ? '수정' : '등록' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
