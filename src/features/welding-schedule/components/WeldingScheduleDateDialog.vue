<script setup>
import { computed, ref, watch } from 'vue'
import {
  formatIsoDate,
  formatKoreanDate,
  parseIsoDate,
} from '@/features/welding-schedule/services/weldingSchedule.service'
import {
  buildMonthCalendarWeeks,
  CALENDAR_WEEK_LABELS,
  formatCalendarMonthLabel,
} from '@/features/welding-schedule/utils/weldingScheduleCalendar'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  row: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'select'])

const selectedDateIso = ref('')
const calendarMonth = ref(new Date())

const syncFromRow = () => {
  const baseIso = String(props.row?.welding_schedule_date ?? '').trim() || formatIsoDate(new Date())
  selectedDateIso.value = baseIso
  const baseDate = parseIsoDate(baseIso) ?? new Date()
  calendarMonth.value = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) syncFromRow()
  },
)

const selectedDateLabel = computed(() => formatKoreanDate(selectedDateIso.value))
const calendarMonthLabel = computed(() => formatCalendarMonthLabel(calendarMonth.value))
const calendarWeeks = computed(() => buildMonthCalendarWeeks(calendarMonth.value, selectedDateIso.value))

const moveMonth = (delta) => {
  const base = calendarMonth.value
  calendarMonth.value = new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

const selectDate = (day) => {
  if (!day?.key) return
  selectedDateIso.value = day.key
  emit('select', day.key)
}
</script>

<template>
  <div
    v-if="open && row"
    class="print-hide fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-base font-extrabold text-slate-900">용접일정 날짜</h3>
          <p class="mt-2 truncate text-sm font-semibold text-slate-700">
            {{ row.company || '-' }} / {{ row.place || '-' }}
          </p>
          <p class="truncate text-sm text-slate-500">{{ row.area || '-' }}</p>
        </div>
        <button type="button" class="shrink-0 text-sm text-slate-500 hover:text-slate-700" @click="emit('close')">
          닫기
        </button>
      </div>

      <p class="mt-5 text-sm font-bold text-slate-700">
        선택일: <span class="text-slate-950">{{ selectedDateLabel }}</span>
      </p>

      <div class="mt-4">
        <div class="mb-3 flex items-center justify-between">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            @click="moveMonth(-1)"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <p class="text-sm font-extrabold text-slate-900">{{ calendarMonthLabel }}</p>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            @click="moveMonth(1)"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-7 gap-1">
          <div
            v-for="label in CALENDAR_WEEK_LABELS"
            :key="label"
            class="flex h-8 items-center justify-center text-xs font-bold text-slate-500"
          >
            {{ label }}
          </div>
          <button
            v-for="day in calendarWeeks.flat()"
            :key="day.key"
            type="button"
            class="flex h-11 items-center justify-center rounded-lg border text-sm font-bold transition"
            :class="[
              day.isSelected
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              !day.isCurrentMonth ? 'opacity-40' : '',
            ]"
            @click="selectDate(day)"
          >
            {{ day.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
