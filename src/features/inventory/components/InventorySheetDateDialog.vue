<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useDialog } from '@/composables/useDialog'
import {
  buildMonthCalendarWeeks,
  CALENDAR_WEEK_LABELS,
  formatCalendarMonthLabel,
} from '../sheet/sheetCalendar'

const props = defineProps({
  open: { type: Boolean, default: false },
  value: { type: String, default: '' },
})

const emit = defineEmits(['close', 'select', 'delete'])

const { confirm } = useDialog()
const panelEl = ref(null)
const calendarMonth = ref(new Date())

const selectedIso = computed(() => String(props.value ?? '').trim())
const calendarMonthLabel = computed(() => formatCalendarMonthLabel(calendarMonth.value))
const calendarWeeks = computed(() => buildMonthCalendarWeeks(calendarMonth.value, selectedIso.value))

const syncMonth = () => {
  const match = selectedIso.value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const base = match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : new Date()
  calendarMonth.value = new Date(base.getFullYear(), base.getMonth(), 1)
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    syncMonth()
    nextTick(() => panelEl.value?.focus())
  },
)

const moveMonth = (delta) => {
  const base = calendarMonth.value
  calendarMonth.value = new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

const selectDate = (day) => {
  if (!day?.key) return
  emit('select', day.key)
}

const requestDelete = async () => {
  const confirmed = await confirm('삭제하시겠습니까?')
  if (!confirmed) return
  emit('delete')
}
</script>

<template>
  <Teleport to="body">
  <div
    v-if="open"
    class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 px-4"
    @click.self="emit('close')"
  >
    <div
      ref="panelEl"
      tabindex="-1"
      class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl outline-none"
      @keydown.esc.prevent="emit('close')"
    >
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-base font-extrabold text-slate-900">일자</h3>
        <button type="button" class="text-sm font-bold text-slate-500 hover:text-slate-700" @click="emit('close')">
          닫기
        </button>
      </div>

      <div class="mt-4">
        <div class="mb-3 flex items-center justify-between">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            aria-label="이전달"
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
            aria-label="다음달"
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
            class="flex h-10 items-center justify-center rounded-lg border text-sm font-bold"
            :class="[
              day.isSelected
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              !day.isCurrentMonth ? 'opacity-40' : '',
              day.isToday && !day.isSelected ? 'border-orange-700' : '',
            ]"
            @click="selectDate(day)"
          >
            {{ day.label }}
          </button>
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
          @click="requestDelete"
        >
          삭제
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>
