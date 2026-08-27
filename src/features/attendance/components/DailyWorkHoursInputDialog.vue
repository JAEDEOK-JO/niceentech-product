<script setup lang="ts">
import type { AttendanceRequest, Employee, DailyWorkHour } from '../types/attendance'
import DailyWorkHoursInputForm from './DailyWorkHoursInputForm.vue'

defineProps<{
  employees: Employee[]
  requests: AttendanceRequest[]
  todayHours: DailyWorkHour[]
  workDate: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', records: { employeeId: number; endTime: string }[]): void
}>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <DailyWorkHoursInputForm
          :employees="employees"
          :requests="requests"
          :today-hours="todayHours"
          :work-date="workDate"
          @close="emit('close')"
          @save="emit('save', $event)"
        />
      </div>
    </div>
  </Teleport>
</template>
