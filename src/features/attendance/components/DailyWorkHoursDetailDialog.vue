<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { WORK_END_TIME_OPTIONS, type AttendanceRequest, type Employee } from '../types/attendance'
import { normalizeDailyWorkDepartment } from '../utils/dailyWorkDepartment'
import { getDailyWorkAbsence, type DailyWorkAbsence } from '../utils/dailyWorkAbsence'

export interface DailyWorkHourDetailRow {
  employeeId: number
  name: string
  assignedDepartment: string
  endTime: string
}

const props = defineProps<{
  visible: boolean
  workDate: string
  department: string
  timeLabel: string
  rows: DailyWorkHourDetailRow[]
  employees: Employee[]
  requests: AttendanceRequest[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update', payload: { workDate: string; employeeId: number; endTime: string }): void
  (e: 'delete', payload: { workDate: string; employeeId: number }): void
  (e: 'deleteAll', payload: { workDate: string; employeeIds: number[] }): void
}>()

interface AbsenceRow {
  employeeId: number
  name: string
  label: string
  absence: DailyWorkAbsence
}

const editMode = ref(false)
const localTimes = ref<Map<number, string>>(new Map())
const employeeById = computed(() => new Map(props.employees.map((employee) => [employee.id, employee] as const)))

const endTimeLabelMap = computed(() => new Map(WORK_END_TIME_OPTIONS.map((option) => [option.value, option.label] as const)))
const fullTimeCount = computed(() =>
  props.rows.filter((row) => employeeById.value.get(row.employeeId)?.isFullTime).length,
)
const contractCount = computed(() => Math.max(0, props.rows.length - fullTimeCount.value))

const absenceRows = computed<AbsenceRow[]>(() =>
  props.employees
    .filter((employee) => normalizeDailyWorkDepartment(employee.assignedDepartment) === props.department)
    .map((employee) => {
      const absence = getDailyWorkAbsence(employee, props.workDate, props.requests)
      if (!absence) return null
      return {
        employeeId: employee.id,
        name: employee.name,
        label: absence.label,
        absence,
      }
    })
    .filter((row): row is AbsenceRow => row !== null)
    .sort((left, right) => left.name.localeCompare(right.name, 'ko')),
)

const leaveRows = computed(() => absenceRows.value.filter((row) => row.absence.type !== 'home-leave'))
const homeLeaveRows = computed(() => absenceRows.value.filter((row) => row.absence.type === 'home-leave'))

watch(
  () => props.rows,
  (rows) => {
    localTimes.value = new Map(rows.map((row) => [row.employeeId, row.endTime]))
    editMode.value = false
  },
  { immediate: true },
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) editMode.value = false
  },
)

function getEndTimeLabel(endTime: string) {
  return endTimeLabelMap.value.get(endTime) ?? endTime
}

function getEmployeeTypeLabel(employeeId: number) {
  return employeeById.value.get(employeeId)?.isFullTime ? '정직원' : '계약직'
}

function getEmployeeTypeClass(employeeId: number) {
  return employeeById.value.get(employeeId)?.isFullTime
    ? 'bg-orange-600 text-white'
    : 'bg-slate-200 text-slate-700'
}

function updateTime(employeeId: number, endTime: string) {
  const next = new Map(localTimes.value)
  next.set(employeeId, endTime)
  localTimes.value = next
  emit('update', { workDate: props.workDate, employeeId, endTime })
}

function deleteAll() {
  emit('deleteAll', {
    workDate: props.workDate,
    employeeIds: props.rows.map((row) => row.employeeId),
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <div class="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <div class="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 class="text-lg font-extrabold text-slate-900">{{ department }} 작업자</h2>
            <p class="mt-1 text-sm font-semibold text-slate-500">{{ workDate }} · {{ timeLabel }} · {{ rows.length }}명</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="rows.length > 0"
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
              @click="editMode = !editMode"
            >{{ editMode ? '완료' : '수정' }}</button>
            <button
              v-if="editMode && rows.length > 0"
              type="button"
              class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-100"
              @click="deleteAll"
            >일괄삭제</button>
            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              @click="emit('close')"
            >닫기</button>
          </div>
        </div>

        <div class="flex-1 space-y-5 overflow-y-auto p-5">
          <section>
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-extrabold text-slate-800">금일 작업인원</h3>
              <div class="flex gap-2 text-xs font-extrabold">
                <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">정직원 {{ fullTimeCount }}명</span>
                <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">계약직 {{ contractCount }}명</span>
              </div>
            </div>
            <div v-if="rows.length === 0" class="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
              표시할 작업자가 없습니다.
            </div>
            <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
              <div
                v-for="row in rows"
                :key="row.employeeId"
                class="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <div class="flex min-w-0 items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-extrabold text-slate-900">{{ row.name }}</p>
                    <div class="mt-0.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
                      <p class="truncate text-[11px] font-bold text-slate-400">{{ row.assignedDepartment }}</p>
                      <span
                        class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold"
                        :class="getEmployeeTypeClass(row.employeeId)"
                      >{{ getEmployeeTypeLabel(row.employeeId) }}</span>
                    </div>
                  </div>
                  <span
                    v-if="!editMode"
                    class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-slate-700"
                  >
                    {{ getEndTimeLabel(row.endTime) }}
                  </span>
                </div>

                <div v-if="editMode" class="mt-2 flex flex-wrap items-center gap-1.5">
                  <select
                    class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    :value="localTimes.get(row.employeeId) ?? row.endTime"
                    @change="updateTime(row.employeeId, ($event.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="option in WORK_END_TIME_OPTIONS"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <button
                    type="button"
                    class="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-extrabold text-red-600 hover:bg-red-100"
                    @click="emit('delete', { workDate, employeeId: row.employeeId })"
                  >삭제</button>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 class="mb-2 text-sm font-extrabold text-slate-800">연차/반차</h3>
            <div v-if="leaveRows.length === 0" class="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
              해당 인원이 없습니다.
            </div>
            <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
              <div
                v-for="row in leaveRows"
                :key="row.employeeId"
                class="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5"
              >
                <p class="truncate text-sm font-extrabold text-slate-900">{{ row.name }}</p>
                <p class="mt-1 text-xs font-extrabold text-blue-700">{{ row.label }}</p>
              </div>
            </div>
          </section>

          <section>
            <h3 class="mb-2 text-sm font-extrabold text-slate-800">귀국휴가중</h3>
            <div v-if="homeLeaveRows.length === 0" class="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
              해당 인원이 없습니다.
            </div>
            <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
              <div
                v-for="row in homeLeaveRows"
                :key="row.employeeId"
                class="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5"
              >
                <p class="truncate text-sm font-extrabold text-slate-900">{{ row.name }}</p>
                <p class="mt-1 text-xs font-extrabold text-amber-700">{{ row.label }}</p>
              </div>
            </div>
          </section>
        </div>

        <div class="border-t border-slate-200 bg-slate-50 px-5 py-3 text-right">
          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
            @click="emit('close')"
          >닫기</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
