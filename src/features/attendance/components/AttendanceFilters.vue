<script setup lang="ts">
import { computed } from 'vue'
import { LEAVE_STATUSES, type AttendanceFilters, type LeaveStatus } from '../types/attendance'

const props = defineProps<{
  filters: AttendanceFilters
  departments: string[]
  isAdmin: boolean
}>()

const emit = defineEmits<{
  (e: 'update:filters', value: AttendanceFilters): void
}>()

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
const months = [
  { value: null, label: '전체 월' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}월` })),
]

const update = <K extends keyof AttendanceFilters>(key: K, value: AttendanceFilters[K]) => {
  emit('update:filters', { ...props.filters, [key]: value })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- 연도 -->
    <select
      :value="filters.year"
      class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
      @change="update('year', Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="y in years" :key="y" :value="y">{{ y }}년</option>
    </select>

    <!-- 월 -->
    <select
      :value="filters.month ?? ''"
      class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
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

    <!-- 부서 (관리자만) -->
    <select
      v-if="isAdmin"
      :value="filters.department"
      class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
      @change="update('department', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">전체 부서</option>
      <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
    </select>

    <!-- 상태 -->
    <select
      :value="filters.status"
      class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
      @change="update('status', ($event.target as HTMLSelectElement).value as LeaveStatus | '')"
    >
      <option value="">전체 상태</option>
      <option v-for="s in LEAVE_STATUSES" :key="s" :value="s">{{ s }}</option>
    </select>

    <!-- 이름 검색 (관리자만) -->
    <input
      v-if="isAdmin"
      :value="filters.searchQuery"
      type="text"
      placeholder="이름 검색"
      class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
      @input="update('searchQuery', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
