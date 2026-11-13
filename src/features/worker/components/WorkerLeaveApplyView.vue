<script setup lang="ts">
import AttendanceForm from '@/features/attendance/components/AttendanceForm.vue'
import type { AttendanceFormState, Employee } from '@/features/attendance/types/attendance'

defineProps<{
  form: AttendanceFormState
  employee: Employee
  loading: boolean
  userId: string
}>()

const emit = defineEmits<{
  (e: 'update:form', value: AttendanceFormState): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div class="bg-white px-4 py-4">
    <div class="mb-5 flex items-center gap-3">
      <button
        type="button"
        class="text-sm font-bold text-slate-500"
        @click="emit('cancel')"
      >
        뒤로
      </button>
      <h2 class="text-lg font-extrabold text-slate-900">휴가 신청</h2>
    </div>
    <AttendanceForm
      :model-value="form"
      :loading="loading"
      :is-edit="false"
      :employees="[employee]"
      hide-employee-selector
      :upload-user-id="userId"
      @update:model-value="emit('update:form', $event)"
      @submit="emit('submit')"
      @cancel="emit('cancel')"
    />
  </div>
</template>
