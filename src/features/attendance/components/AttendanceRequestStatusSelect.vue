<script setup lang="ts">
import { computed } from 'vue'
import type { AttendanceRequest } from '../types/attendance'
import { getAttendanceStatusLabel } from '../utils/attendanceApprover'
import {
  attendanceStatusChangeOptions,
  canChangeAttendanceStatus,
  isAttendanceStatusChangeValue,
  type AttendanceStatusChangeValue,
} from '../utils/attendanceRequestStatus'

const props = defineProps<{
  item: AttendanceRequest
  badgeClass?: string
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'change', status: AttendanceStatusChangeValue): void
}>()

const showSelect = computed(() => props.editable && canChangeAttendanceStatus(props.item.status))

function onChange(event: Event) {
  const el = event.target as HTMLSelectElement
  const next = el.value
  el.value = props.item.status
  if (!isAttendanceStatusChangeValue(next) || next === props.item.status) return
  emit('change', next)
}
</script>

<template>
  <span v-if="showSelect" class="relative inline-flex items-center">
    <select
      class="cursor-pointer appearance-none rounded-full border-0 py-1 pl-2.5 pr-5 text-center text-[11px] font-bold outline-none"
      :class="badgeClass"
      :value="item.status"
      @click.stop
      @mousedown.stop
      @change="onChange"
    >
      <option
        v-for="option in attendanceStatusChangeOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <span class="pointer-events-none absolute right-1.5 text-[9px] leading-none opacity-70">▾</span>
  </span>
  <span
    v-else
    class="rounded-full px-2.5 py-1 text-[11px] font-bold"
    :class="badgeClass"
  >
    {{ getAttendanceStatusLabel(item.status) }}
  </span>
</template>
