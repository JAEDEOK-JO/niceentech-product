<script setup lang="ts">
import { ref, watch } from 'vue'
import { WORK_END_TIME_OPTIONS } from '../types/attendance'

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
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update', payload: { workDate: string; employeeId: number; endTime: string }): void
  (e: 'delete', payload: { workDate: string; employeeId: number }): void
}>()

const localTimes = ref<Map<number, string>>(new Map())

watch(
  () => props.rows,
  (rows) => {
    localTimes.value = new Map(rows.map((row) => [row.employeeId, row.endTime]))
  },
  { immediate: true },
)

function updateTime(employeeId: number, endTime: string) {
  const next = new Map(localTimes.value)
  next.set(employeeId, endTime)
  localTimes.value = next
}

function saveRow(employeeId: number) {
  const endTime = localTimes.value.get(employeeId)
  if (!endTime) return
  emit('update', { workDate: props.workDate, employeeId, endTime })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <div class="flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div class="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 class="text-lg font-extrabold text-slate-900">{{ department }} 작업자</h2>
            <p class="mt-1 text-sm font-semibold text-slate-500">{{ workDate }} · {{ timeLabel }} · {{ rows.length }}명</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            @click="emit('close')"
          >✕</button>
        </div>

        <div class="flex-1 overflow-y-auto p-5">
          <div v-if="rows.length === 0" class="py-12 text-center text-sm text-slate-400">
            표시할 작업자가 없습니다.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="row in rows"
              :key="row.employeeId"
              class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-extrabold text-slate-900">{{ row.name }}</p>
                <p class="text-[11px] font-bold text-slate-400">{{ row.assignedDepartment }}</p>
              </div>

              <div class="flex flex-wrap items-center gap-1.5">
                <select
                  class="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                  class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-slate-700"
                  @click="saveRow(row.employeeId)"
                >수정</button>
                <button
                  type="button"
                  class="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-600 hover:bg-red-100"
                  @click="emit('delete', { workDate, employeeId: row.employeeId })"
                >삭제</button>
              </div>
            </div>
          </div>
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
