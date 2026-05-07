<script setup lang="ts">
import { computed, ref } from 'vue'
import { WORK_END_TIME_OPTIONS, type DailyWorkHour, type Employee } from '../types/attendance'
import {
  DAILY_WORK_DEPARTMENT_ORDER,
  getDailyWorkDepartmentRank,
  normalizeDailyWorkDepartment,
} from '../utils/dailyWorkDepartment'
import DailyWorkHoursDetailDialog from './DailyWorkHoursDetailDialog.vue'

const props = defineProps<{
  employees: Employee[]
  workHours: DailyWorkHour[]
  workDate: string
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'openInput'): void
  (e: 'refresh'): void
  (e: 'delete', payload: { workDate: string; employeeId: number }): void
  (e: 'deleteAll', payload: { workDate: string; employeeIds: number[] }): void
  (e: 'update', payload: { workDate: string; employeeId: number; endTime: string }): void
  (e: 'selectDate', workDate: string): void
}>()

interface WorkHourRow {
  employeeId: number
  name: string
  assignedDepartment: string
  workDate: string
  endTime: string
}

interface BadgeGroup {
  workDate: string
  department: string
  endTime: string
  label: string
  count: number
  total: number
  rows: WorkHourRow[]
}

interface CalendarDay {
  workDate: string
  month: number
  day: number
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  badges: BadgeGroup[]
}

interface SelectedDetailKey {
  workDate: string
  department: string
  endTime: string
}

const selectedDetail = ref<SelectedDetailKey | null>(null)

const employeeById = computed(() => new Map(props.employees.map((employee) => [employee.id, employee] as const)))

const departmentTotals = computed(() => {
  const counts = new Map<string, number>()
  for (const employee of props.employees) {
    const department = normalizeDailyWorkDepartment(employee.assignedDepartment)
    counts.set(department, (counts.get(department) ?? 0) + 1)
  }
  return counts
})

const rows = computed<WorkHourRow[]>(() => {
  return props.workHours
    .map((record) => {
      const employee = employeeById.value.get(record.employeeId)
      if (!employee) return null
      return {
        employeeId: employee.id,
        name: employee.name,
        assignedDepartment: normalizeDailyWorkDepartment(employee.assignedDepartment),
        workDate: record.workDate,
        endTime: record.endTime,
      } as WorkHourRow
    })
    .filter((row): row is WorkHourRow => row !== null)
    .sort((left, right) => {
      const dept = getDailyWorkDepartmentRank(left.assignedDepartment) - getDailyWorkDepartmentRank(right.assignedDepartment)
      if (dept !== 0) return dept
      return left.name.localeCompare(right.name, 'ko')
    })
})

const monthLabel = computed(() => {
  const date = new Date(`${props.workDate}T00:00:00`)
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 작업시간`
})

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftMonth(delta: number) {
  const current = new Date(`${props.workDate}T00:00:00`)
  const next = new Date(current.getFullYear(), current.getMonth() + delta, 1)
  emit('selectDate', formatLocalDate(next))
}

function selectToday() {
  emit('selectDate', formatLocalDate(new Date()))
}

function labelOfTime(value: string) {
  return WORK_END_TIME_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function badgeClass(department: string) {
  if (department === '메인관') return 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
  if (department === '가지관') return 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
  if (department === '나사') return 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
  if (department === '용접') return 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
  if (department === 'CNC') return 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
  return 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
}

function badgeText(group: BadgeGroup) {
  const time = labelOfTime(group.endTime)
  if (group.total > 0 && group.count === group.total) return `${group.department} ${time}`
  return `${group.department} ${group.count}명 ${time}`
}

const badgesByDate = computed(() => {
  const map = new Map<string, BadgeGroup[]>()
  for (const row of rows.value) {
    const key = `${row.workDate}:${row.assignedDepartment}:${row.endTime}`
    const dateGroups = map.get(row.workDate) ?? []
    let group = dateGroups.find((item) => `${item.workDate}:${item.department}:${item.endTime}` === key)
    if (!group) {
      group = {
        workDate: row.workDate,
        department: row.assignedDepartment,
        endTime: row.endTime,
        label: labelOfTime(row.endTime),
        count: 0,
        total: departmentTotals.value.get(row.assignedDepartment) ?? 0,
        rows: [],
      }
      dateGroups.push(group)
      map.set(row.workDate, dateGroups)
    }
    group.rows.push(row)
    group.count += 1
  }

  for (const groups of map.values()) {
    groups.sort((left, right) => {
      const department = left.department.localeCompare(right.department, 'ko')
      if (department !== 0) return department
      return left.endTime.localeCompare(right.endTime)
    })
  }
  return map
})

const calendarDays = computed<CalendarDay[]>(() => {
  const selected = new Date(`${props.workDate}T00:00:00`)
  const firstDay = new Date(selected.getFullYear(), selected.getMonth(), 1)
  const lastDay = new Date(selected.getFullYear(), selected.getMonth() + 1, 0)
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - firstDay.getDay())
  const end = new Date(lastDay)
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()))
  const today = formatLocalDate(new Date())
  const days: CalendarDay[] = []

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const workDate = formatLocalDate(cursor)
    days.push({
      workDate,
      month: cursor.getMonth() + 1,
      day: cursor.getDate(),
      inMonth: cursor.getMonth() === selected.getMonth(),
      isToday: workDate === today,
      isSelected: workDate === props.workDate,
      badges: badgesByDate.value.get(workDate) ?? [],
    })
  }
  return days
})

const selectedDateTotal = computed(() => {
  return props.workHours.filter((record) => record.workDate === props.workDate).length
})

function openDetail(group: BadgeGroup) {
  selectedDetail.value = {
    workDate: group.workDate,
    department: group.department,
    endTime: group.endTime,
  }
}

function closeDetail() {
  selectedDetail.value = null
}

const selectedDetailGroup = computed<BadgeGroup | null>(() => {
  if (!selectedDetail.value) return null
  const key = selectedDetail.value
  const group = badgesByDate.value
    .get(key.workDate)
    ?.find((item) => item.department === key.department && item.endTime === key.endTime)

  if (group) return group
  return {
    workDate: key.workDate,
    department: key.department,
    endTime: key.endTime,
    label: labelOfTime(key.endTime),
    count: 0,
    total: departmentTotals.value.get(key.department) ?? 0,
    rows: [],
  }
})

function handleDelete(payload: { workDate: string; employeeId: number }) {
  emit('delete', payload)
}

function handleDeleteAll(payload: { workDate: string; employeeIds: number[] }) {
  emit('deleteAll', payload)
}

function handleUpdate(payload: { workDate: string; employeeId: number; endTime: string }) {
  emit('update', payload)
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="text-base font-extrabold text-slate-800">{{ monthLabel }}</h2>
        <div class="h-5 w-px bg-slate-200" />
        <div class="flex flex-wrap gap-2 text-xs font-bold">
          <span
            v-for="department in DAILY_WORK_DEPARTMENT_ORDER"
            :key="department"
            class="inline-flex items-center rounded-full border px-2.5 py-1"
            :class="badgeClass(department)"
          >
            {{ department }}
          </span>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <div class="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            class="rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
            @click="shiftMonth(-1)"
          >이전월</button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
            @click="selectToday"
          >오늘</button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
            @click="shiftMonth(1)"
          >다음월</button>
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          @click="emit('refresh')"
        >새로고침</button>
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-700"
          @click="emit('openInput')"
        >{{ workDate }} 입력</button>
      </div>
    </div>

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white py-16 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div class="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-extrabold text-slate-500">
        <div class="py-2 text-red-500">일</div>
        <div class="py-2">월</div>
        <div class="py-2">화</div>
        <div class="py-2">수</div>
        <div class="py-2">목</div>
        <div class="py-2">금</div>
        <div class="py-2 text-blue-500">토</div>
      </div>

      <div class="grid grid-cols-7">
        <div
          v-for="day in calendarDays"
          :key="day.workDate"
          role="button"
          tabindex="0"
          class="min-h-[132px] border-b border-r border-slate-100 p-2 text-left align-top transition-colors hover:bg-slate-50"
          :class="[
            !day.inMonth ? 'bg-slate-50/70 text-slate-300' : 'bg-white text-slate-700',
            day.isSelected ? 'ring-2 ring-inset ring-slate-900' : '',
          ]"
          @click="emit('selectDate', day.workDate)"
          @keydown.enter="emit('selectDate', day.workDate)"
        >
          <div class="mb-1 flex items-center justify-between gap-1">
            <span
              class="inline-flex min-h-6 items-center justify-center rounded-full px-2 py-1 text-xs font-extrabold"
              :class="day.isToday ? 'bg-slate-900 text-white' : ''"
            >
              {{ day.month }}/{{ day.day }}
            </span>
            <span v-if="day.workDate === workDate" class="text-[10px] font-extrabold text-slate-400">
              선택 {{ selectedDateTotal }}명
            </span>
          </div>

          <div class="grid grid-cols-3 gap-1">
            <button
              v-for="badge in day.badges"
              :key="`${badge.department}-${badge.endTime}`"
              type="button"
              class="min-h-7 w-full rounded-lg border px-1.5 py-1 text-center text-[10px] font-extrabold leading-tight break-keep"
              :class="badgeClass(badge.department)"
              @click.stop="openDetail(badge)"
            >
              {{ badgeText(badge) }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <DailyWorkHoursDetailDialog
      :visible="selectedDetail !== null"
      :work-date="selectedDetailGroup?.workDate ?? ''"
      :department="selectedDetailGroup?.department ?? ''"
      :time-label="selectedDetailGroup?.label ?? ''"
      :rows="selectedDetailGroup?.rows ?? []"
      @close="closeDetail"
      @update="handleUpdate"
      @delete="handleDelete"
      @delete-all="handleDeleteAll"
    />
  </div>
</template>
