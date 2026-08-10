<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AttendanceRequest } from '../types/attendance'
import { formatLeaveDaysCountLabel } from '../utils/attendanceLeaveType'
import {
  buildSummaryCalendarDays,
  leaveTypeChipClass,
  type SummaryCalendarDay,
} from '../utils/attendanceSummaryCalendar'

const props = defineProps<{
  requests: AttendanceRequest[]
  loading: boolean
  year: number
  month: number
}>()

const emit = defineEmits<{
  (e: 'update:year', value: number): void
  (e: 'update:month', value: number): void
  (e: 'openRequest', item: AttendanceRequest): void
}>()

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const
const MAX_VISIBLE_CHIPS = 3

const selectedDay = ref<SummaryCalendarDay | null>(null)

const yearOptions = computed(() => {
  const baseYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, index) => baseYear - 2 + index)
})

const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)

const calendarDays = computed(() =>
  buildSummaryCalendarDays(props.year, props.month, props.requests),
)

const monthLeaveCount = computed(() => {
  const keys = new Set<string>()
  for (const day of calendarDays.value) {
    if (!day.inMonth) continue
    for (const item of day.requests) keys.add(String(item.id))
  }
  return keys.size
})

watch(
  () => [props.year, props.month, props.requests] as const,
  () => {
    selectedDay.value = null
  },
)

function shiftMonth(delta: number) {
  const date = new Date(props.year, props.month - 1 + delta, 1)
  emit('update:year', date.getFullYear())
  emit('update:month', date.getMonth() + 1)
}

function openDay(day: SummaryCalendarDay) {
  if (!day.inMonth) return
  selectedDay.value = day
}

function closeDay() {
  selectedDay.value = null
}

function formatPeriod(item: AttendanceRequest) {
  const s = item.startDate?.slice(0, 10) || '-'
  const e = item.endDate?.slice(0, 10) || '-'
  return s === e ? s : `${s} ~ ${e}`
}
</script>

<template>
  <section>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-extrabold text-slate-900">근태요약</h2>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {{ monthLeaveCount }}건
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          @click="shiftMonth(-1)"
        >
          이전
        </button>
        <select
          :value="year"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
          @change="emit('update:year', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="option in yearOptions" :key="option" :value="option">{{ option }}년</option>
        </select>
        <select
          :value="month"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
          @change="emit('update:month', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="option in monthOptions" :key="option" :value="option">{{ option }}월</option>
        </select>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          @click="shiftMonth(1)"
        >
          다음
        </button>
      </div>
    </div>

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
      불러오는 중...
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div class="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        <div
          v-for="(label, index) in WEEKDAYS"
          :key="label"
          class="px-2 py-2 text-center text-xs font-bold"
          :class="index === 5 ? 'text-blue-500' : index === 6 ? 'text-red-500' : 'text-slate-500'"
        >
          {{ label }}
        </div>
      </div>

      <div class="grid grid-cols-7 auto-rows-fr">
        <button
          v-for="day in calendarDays"
          :key="day.date"
          type="button"
          class="min-h-[7.5rem] border-b border-r border-slate-100 p-1.5 text-left transition last:border-r-0 sm:min-h-[8.5rem] sm:p-2"
          :class="[
            day.inMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/70',
            day.isToday ? 'ring-2 ring-inset ring-slate-900' : '',
          ]"
          :disabled="!day.inMonth"
          @click="openDay(day)"
        >
          <div class="mb-1 flex items-center justify-between gap-1">
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold"
              :class="[
                day.isToday ? 'bg-slate-900 text-white' : '',
                !day.inMonth ? 'text-slate-300' : day.isToday ? '' : 'text-slate-700',
              ]"
            >
              {{ day.day }}
            </span>
            <span
              v-if="day.requests.length > 0"
              class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
            >
              {{ day.requests.length }}
            </span>
          </div>

          <div v-if="day.inMonth && day.requests.length > 0" class="space-y-0.5">
            <div
              v-for="item in day.requests.slice(0, MAX_VISIBLE_CHIPS)"
              :key="`${day.date}-${item.id}`"
              class="truncate rounded px-1 py-0.5 text-[10px] font-bold leading-tight sm:text-[11px]"
              :class="leaveTypeChipClass(item.leaveType)"
            >
              {{ item.userName }} · {{ item.leaveType }}
            </div>
            <p
              v-if="day.requests.length > MAX_VISIBLE_CHIPS"
              class="px-1 text-[10px] font-bold text-slate-400"
            >
              +{{ day.requests.length - MAX_VISIBLE_CHIPS }}
            </p>
          </div>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="selectedDay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="closeDay"
      >
        <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 class="text-base font-extrabold text-slate-900">
              {{ selectedDay.date }} · {{ selectedDay.requests.length }}건
            </h3>
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
              @click="closeDay"
            >
              닫기
            </button>
          </div>
          <div class="max-h-[65vh] overflow-y-auto p-4">
            <div
              v-if="selectedDay.requests.length === 0"
              class="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400"
            >
              없음
            </div>
            <div v-else class="space-y-2">
              <button
                v-for="item in selectedDay.requests"
                :key="item.id"
                type="button"
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                @click="emit('openRequest', item); closeDay()"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    :class="leaveTypeChipClass(item.leaveType)"
                  >
                    {{ item.leaveType }}
                  </span>
                  <span class="text-sm font-extrabold text-slate-900">{{ item.userName }}</span>
                  <span class="text-xs text-slate-400">{{ item.department || '-' }}</span>
                </div>
                <p class="mt-1.5 text-sm text-slate-600">
                  {{ formatPeriod(item) }}
                  · {{ formatLeaveDaysCountLabel(item.leaveType, item.daysCount) }}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
