<script setup lang="ts">
import { computed } from 'vue'
import { WORK_END_TIME_OPTIONS, type Employee, type DailyWorkHour } from '../types/attendance'

const props = defineProps<{
  employees: Employee[]
  todayHours: DailyWorkHour[]
  workDate: string
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'openInput'): void
  (e: 'refresh'): void
  (e: 'delete', payload: { workDate: string; employeeId: number }): void
}>()

const ASSIGNED_DEPT_ORDER = ['메인관', '가지관', '치부', '포장', '용접', '나사', 'CNC', '페인트']

interface Row {
  employeeId: number
  name: string
  assignedDepartment: string
  department: string
  endTime: string
}

const rows = computed<Row[]>(() => {
  const empById = new Map(props.employees.map((e) => [e.id, e] as const))
  return props.todayHours
    .map((h) => {
      const emp = empById.get(h.employeeId)
      if (!emp) return null
      return {
        employeeId: emp.id,
        name: emp.name,
        assignedDepartment: emp.assignedDepartment,
        department: emp.department,
        endTime: h.endTime,
      } as Row
    })
    .filter((x): x is Row => x !== null)
    .sort((a, b) => {
      const d = (ASSIGNED_DEPT_ORDER.indexOf(a.assignedDepartment) + 1 || 99) -
                (ASSIGNED_DEPT_ORDER.indexOf(b.assignedDepartment) + 1 || 99)
      if (d !== 0) return d
      return a.name.localeCompare(b.name, 'ko')
    })
})

interface Group {
  dept: string
  buckets: { time: string; label: string; rows: Row[] }[]
  total: number
}

const grouped = computed<Group[]>(() => {
  const map = new Map<string, Row[]>()
  for (const r of rows.value) {
    const key = r.assignedDepartment || '미지정'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  const result: Group[] = []
  for (const [dept, list] of map) {
    const buckets = WORK_END_TIME_OPTIONS.map((opt) => ({
      time: opt.value,
      label: opt.label,
      rows: list.filter((r) => r.endTime === opt.value),
    })).filter((b) => b.rows.length > 0)
    result.push({ dept, buckets, total: list.length })
  }
  result.sort((a, b) =>
    (ASSIGNED_DEPT_ORDER.indexOf(a.dept) + 1 || 99) -
    (ASSIGNED_DEPT_ORDER.indexOf(b.dept) + 1 || 99),
  )
  return result
})

const grandTotal = computed(() => rows.value.length)
</script>

<template>
  <div>
    <!-- 헤더 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-extrabold text-slate-800">금일 작업시간</h2>
        <p class="mt-0.5 text-xs text-slate-500">{{ workDate }} · 입력 {{ grandTotal }}명</p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          @click="emit('refresh')"
        >새로고침</button>
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-700"
          @click="emit('openInput')"
        >+ 입력</button>
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
    </div>

    <div v-else-if="grouped.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
      오늘 입력된 작업시간이 없습니다.
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="g in grouped"
        :key="g.dept"
        class="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-extrabold text-slate-800">
            {{ g.dept }}
            <span class="ml-1 text-xs font-bold text-slate-400">{{ g.total }}명</span>
          </h3>
        </div>
        <div class="space-y-3">
          <div v-for="b in g.buckets" :key="b.time">
            <div class="mb-1.5 flex items-center gap-2">
              <span class="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-extrabold text-white">{{ b.label }}</span>
              <span class="text-xs font-bold text-slate-500">{{ b.rows.length }}명</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="r in b.rows"
                :key="r.employeeId"
                class="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700"
              >
                {{ r.name }}
                <button
                  type="button"
                  class="text-slate-300 hover:text-red-500"
                  title="삭제"
                  @click="emit('delete', { workDate, employeeId: r.employeeId })"
                >✕</button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
