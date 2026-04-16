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
      acc.totalUsedDays += item.totalUsedDays
      return acc
    },
    { people: 0, annualCount: 0, halfDayCount: 0, sickCount: 0, totalUsedDays: 0 },
  ),
)

const formatDays = (value: number) => {
  const safe = Number(value ?? 0)
  if (!Number.isFinite(safe)) return '0일'
  return Number.isInteger(safe) ? `${safe}일` : `${safe.toFixed(1)}일`
}
</script>

<template>
  <section>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-extrabold text-slate-900">근태요약</h2>
        <p class="mt-1 text-sm text-slate-500">승인 완료된 휴가 기준으로 월별 사용 현황을 보여줍니다.</p>
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

    <div class="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
      <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
        <p class="text-xs font-medium text-emerald-600">총 사용일</p>
        <p class="mt-2 text-2xl font-extrabold text-emerald-700">{{ formatDays(summaryTotals.totalUsedDays) }}</p>
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

        <p class="mt-3 text-xs font-semibold text-slate-600">
          반차 {{ summary.halfDayCount }}회
          연차 {{ summary.annualCount }}회
          <template v-if="summary.sickCount > 0"> 병가 {{ summary.sickCount }}회</template>
          총 {{ formatDays(summary.totalUsedDays) }}
        </p>

        <div class="mt-4 rounded-xl bg-slate-900 px-3 py-3 text-white">
          <p class="text-xs font-medium text-slate-300">총 사용일</p>
          <p class="mt-1 text-2xl font-extrabold">{{ formatDays(summary.totalUsedDays) }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
