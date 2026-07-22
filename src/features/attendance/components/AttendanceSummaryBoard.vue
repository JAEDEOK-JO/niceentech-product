<script setup lang="ts">
import { computed } from 'vue'
import type { AttendanceMonthlySummary } from '../types/attendance'

const props = defineProps<{
  summaries: AttendanceMonthlySummary[]
  loading: boolean
  year: number
  month: number
}>()

const emit = defineEmits<{
  (e: 'update:year', value: number): void
  (e: 'update:month', value: number): void
  (e: 'openDetail', summary: AttendanceMonthlySummary): void
}>()

const yearOptions = computed(() => {
  const baseYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, index) => baseYear - 2 + index)
})

const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)

const summaryTotals = computed(() =>
  props.summaries.reduce(
    (acc, item) => {
      acc.people += 1
      acc.annualCount += item.annualCount
      acc.halfDayCount += item.halfDayCount
      acc.sickCount += item.sickCount
      return acc
    },
    { people: 0, annualCount: 0, halfDayCount: 0, sickCount: 0 },
  ),
)
</script>

<template>
  <section>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-extrabold text-slate-900">근태요약</h2>
      </div>
      <div class="flex items-center gap-2">
        <select
          :value="year"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
          @change="emit('update:year', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="option in yearOptions" :key="option" :value="option">{{ option }}년</option>
        </select>
        <select
          :value="month"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
          @change="emit('update:month', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="option in monthOptions" :key="option" :value="option">{{ option }}월</option>
        </select>
      </div>
    </div>

    <div class="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-400">사용 직원</p>
        <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ summaryTotals.people }}명</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-400">연차/반차</p>
        <p class="mt-2 text-base font-extrabold text-slate-900">연차 {{ summaryTotals.annualCount }}회 / 반차 {{ summaryTotals.halfDayCount }}회</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-400">병가</p>
        <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ summaryTotals.sickCount }}회</p>
      </div>
    </div>

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
      근태요약을 불러오는 중...
    </div>
    <div
      v-else-if="summaries.length === 0"
      class="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400"
    >
      선택한 월에 승인된 휴가 사용 내역이 없습니다.
    </div>
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="summary in summaries"
        :key="`${summary.userId}-${summary.userName}`"
        class="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
        @click="emit('openDetail', summary)"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-extrabold text-slate-900">{{ summary.userName }}</h3>
            <p class="mt-1 text-xs text-slate-400">{{ summary.department || '부서 미지정' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {{ summary.totalApprovedCount }}건
            </span>
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
              @click.stop="emit('openDetail', summary)"
            >
              상세보기
            </button>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-1.5 text-xs font-bold">
          <span class="rounded-full bg-blue-100 px-3 py-1 text-blue-700">반차 {{ summary.halfDayCount }}회</span>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-slate-700">연차 {{ summary.annualCount }}회</span>
          <span class="rounded-full bg-purple-100 px-3 py-1 text-purple-700">병가 {{ summary.sickCount }}회</span>
          <span v-if="summary.otherCount > 0" class="rounded-full bg-orange-100 px-3 py-1 text-orange-700">기타 {{ summary.otherCount }}회</span>
        </div>
      </article>
    </div>
  </section>
</template>
