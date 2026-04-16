<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDialog } from '@/composables/useDialog'
import type { Employee } from '../types/attendance'
import type { EmployeeFormData } from '../services/attendance.service'

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
        return emp.name.toLowerCase().includes(q) || emp.role.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      const d1 = (DEPT_ORDER[a.department] ?? 99) - (DEPT_ORDER[b.department] ?? 99)
      if (d1 !== 0) return d1
      const d2 = (ASSIGNED_DEPT_ORDER[a.assignedDepartment] ?? 99) - (ASSIGNED_DEPT_ORDER[b.assignedDepartment] ?? 99)
      if (d2 !== 0) return d2
      return (a.isFullTime === b.isFullTime ? 0 : a.isFullTime ? -1 : 1)
    }),
)

// ─── 폼 상태 ───────────────────────────────────────────────────────────────────
const formVisible = ref(false)
const isEditMode = ref(false)
const editTargetId = ref<number | null>(null)

const DEPARTMENTS = ['생산부', '용접부', '나사부', 'CNC'] as const
const ROLES = ['반장', '작업자'] as const
const DEPT_ORDER: Record<string, number> = { 생산부: 0, 용접부: 1, 나사부: 2, CNC: 3 }
const ASSIGNED_DEPT_ORDER: Record<string, number> = { 가지관: 0, 메인관: 1, 치부: 2, 포장: 3, 용접: 4, 나사: 5, CNC: 6, 페인트: 7 }
const ASSIGNED_DEPARTMENTS = ['메인관', '가지관', '치부', '포장', '용접', '나사', 'CNC', '페인트'] as const

const emptyForm = (): EmployeeFormData => ({
  name: '',
  department: '생산부',
  assignedDepartment: '',
  isFullTime: true,
  nationality: '한국',
  role: '작업자',
  hireDate: '',
  homeLeaveStart: '',
  homeLeaveEnd: '',
})

const form = ref<EmployeeFormData>(emptyForm())

function openCreate() {
  form.value = emptyForm()
  isEditMode.value = false
  editTargetId.value = null
  formVisible.value = true
}

function openEdit(emp: Employee) {
  form.value = {
    name: emp.name,
    department: emp.department,
    assignedDepartment: emp.assignedDepartment,
    isFullTime: emp.isFullTime,
    nationality: emp.nationality,
    role: emp.role,
    hireDate: emp.hireDate ?? '',
    homeLeaveStart: emp.homeLeaveStart ?? '',
    homeLeaveEnd: emp.homeLeaveEnd ?? '',
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
  if (isEditMode.value && editTargetId.value !== null) {
    emit('update', { id: editTargetId.value, data: { ...form.value } })
  } else {
    emit('create', { ...form.value })
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
  if (n === '베트남') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-600'
}
</script>

<template>
  <div>
    <!-- 툴바 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="이름 / 역할 검색"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
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
        class="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
        @click="openCreate"
      >
        + 직원 등록
      </button>
    </div>

    <!-- 로딩 -->
    <div v-if="loading" class="py-16 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
    </div>

    <!-- 테이블 -->
    <div v-else-if="!loading" class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50">
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">이름</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">부서</th>
            <th class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">담당부서</th>
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
            <td colspan="9" class="py-12 text-center text-sm text-slate-400">등록된 직원이 없습니다.</td>
          </tr>
          <tr
            v-for="emp in filtered"
            :key="emp.id"
            class="border-b border-slate-200 last:border-0 hover:bg-slate-50"
          >
            <td class="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-900">{{ emp.name }}</td>
            <td class="border-r border-slate-200 px-4 py-3 text-center text-slate-700">{{ emp.department || '-' }}</td>
            <td class="border-r border-slate-200 px-4 py-3 text-center text-slate-700">{{ emp.assignedDepartment || '-' }}</td>
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
                  <option v-for="d in DEPARTMENTS" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
            </div>

            <!-- 역할 + 국적 -->
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
                <input
                  v-model="form.nationality"
                  type="text"
                  placeholder="한국"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
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
                <option v-for="d in ASSIGNED_DEPARTMENTS" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>

            <!-- 입사일 -->
            <div>
              <label class="mb-1 block text-xs font-bold text-slate-600">입사일</label>
              <input
                v-model="form.hireDate"
                type="date"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
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
