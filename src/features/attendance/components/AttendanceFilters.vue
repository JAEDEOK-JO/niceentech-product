<script setup lang="ts">
import { LEAVE_STATUSES, type AttendanceFilters, type LeaveStatus } from '../types/attendance'
import { getAttendanceStatusLabel } from '../utils/attendanceApprover'

const props = defineProps<{
  filters: AttendanceFilters
  departments: string[]
  isAdmin: boolean
}>()

const emit = defineEmits<{
  (e: 'update:filters', value: AttendanceFilters): void
  (e: 'printAllApproved'): void
}>()

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
const months = [
  { value: null, label: '전체 월' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}월` })),
]

const filterStatuses = LEAVE_STATUSES.filter((s) => s !== '부서장승인')

const update = <K extends keyof AttendanceFilters>(key: K, value: AttendanceFilters[K]) => {
  emit('update:filters', { ...props.filters, [key]: value })
}

const selectClass =
  'h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300'
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-3">
    <div class="flex flex-wrap items-center gap-2">
      <select
        :value="filters.year"
        :class="selectClass"
        @change="update('year', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="y in years" :key="y" :value="y">{{ y }}년</option>
      </select>

      <select
        :value="filters.month ?? ''"
        :class="[selectClass, 'min-w-[5.5rem]']"
        @change="
          update(
            'month',
            ($event.target as HTMLSelectElement).value === ''
              ? null
              : Number(($event.target as HTMLSelectElement).value),
          )
        "
      >
        <option v-for="m in months" :key="String(m.value)" :value="m.value ?? ''">
          {{ m.label }}
        </option>
      </select>

      <select
        v-if="isAdmin"
        :value="filters.department"
        :class="[selectClass, 'min-w-[6.5rem]']"
        @change="update('department', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">전체 부서</option>
        <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
      </select>

      <select
        :value="filters.status"
        :class="[selectClass, 'min-w-[7.5rem]']"
        @change="update('status', ($event.target as HTMLSelectElement).value as LeaveStatus | '')"
      >
        <option value="">전체 상태</option>
        <option v-for="s in filterStatuses" :key="s" :value="s">{{ getAttendanceStatusLabel(s) }}</option>
      </select>

      <input
        v-if="isAdmin"
        :value="filters.searchQuery"
        type="text"
        placeholder="이름 검색"
        class="h-9 min-w-[8rem] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:max-w-[12rem]"
        @input="update('searchQuery', ($event.target as HTMLInputElement).value)"
      />

      <button
        v-if="isAdmin"
        type="button"
        class="ml-auto h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        @click="emit('printAllApproved')"
      >
        전체인쇄
      </button>
    </div>
  </div>
</template>
