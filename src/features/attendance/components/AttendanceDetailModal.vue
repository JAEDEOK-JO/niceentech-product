<script setup lang="ts">
import type { AttendanceRequest, Employee } from '../types/attendance'
import type { SignatureInfo } from '../services/attendance.service'
import AttendanceLeaveApplicationDocument from './AttendanceLeaveApplicationDocument.vue'

defineProps<{
  item: AttendanceRequest
  employees: Employee[]
  signatures: SignatureInfo[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/50 p-0 md:items-center md:justify-center md:px-4 md:py-6"
    @click.self="emit('close')"
  >
    <div class="h-dvh max-h-dvh w-full overflow-y-auto bg-white shadow-2xl md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6 md:py-4">
        <h2 class="text-base font-extrabold text-slate-700">휴가 신청 상세</h2>
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          @click="emit('close')"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-4 md:p-6">
        <AttendanceLeaveApplicationDocument :item="item" :employees="employees" />
      </div>
    </div>
  </div>
</template>
