<script setup>
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import MainProductionPlanGroupTable from '@/features/main/MainProductionPlanGroupTable.vue'

const props = defineProps({
  pageTitle: { type: String, required: true },
  weekOffset: { type: Number, default: 0 },
  selectedTuesdayIso: { type: String, default: '' },
  searchText: { type: String, default: '' },
  planLoading: { type: Boolean, default: false },
  planError: { type: String, default: '' },
  groupedRows: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'move-week',
  'reset-week',
  'go-register',
  'search-change',
  'select-tuesday',
])

const overallTotals = computed(() =>
  props.groupedRows.reduce(
    (acc, group) => {
      acc.head += Number(group?.totals?.head ?? 0)
      acc.hole += Number(group?.totals?.hole ?? 0)
      acc.groove += Number(group?.totals?.groove ?? 0)
      acc.weight += Number(group?.totals?.weight ?? 0)
      return acc
    },
    { head: 0, hole: 0, groove: 0, weight: 0 },
  ),
)

const isCalendarDialogOpen = ref(false)
const localCalendarValue = ref('')
const localSearchText = ref('')
const localCalendarMonth = ref(new Date())
const calendarWeekLabels = ['일', '월', '화', '수', '목', '금', '토']

watch(
  () => props.searchText,
  (value) => {
    localSearchText.value = String(value ?? '')
  },
  { immediate: true },
)

watch(
  () => props.selectedTuesdayIso,
  (value) => {
    localCalendarValue.value = String(value ?? '')
    syncCalendarMonth(localCalendarValue.value)
  },
  { immediate: true },
)

function parseIsoDate(value) {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return null
  const [, y, m, d] = matched
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

function formatIsoDate(date) {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function syncCalendarMonth(value) {
  const parsed = parseIsoDate(value)
  const base = parsed ?? new Date()
  localCalendarMonth.value = new Date(base.getFullYear(), base.getMonth(), 1)
}

const isCalendarTuesday = computed(() => {
  const date = parseIsoDate(localCalendarValue.value)
  return Boolean(date) && date.getDay() === 2
})

const hasActiveSearch = computed(() => String(props.searchText ?? '').trim().length > 0)
const visibleGroups = computed(() => {
  if (!hasActiveSearch.value) return props.groupedRows
  return props.groupedRows.filter((group) => Array.isArray(group?.rows) && group.rows.length > 0)
})

const calendarMonthLabel = computed(() => {
  const base = localCalendarMonth.value
  return `${base.getFullYear()}년 ${String(base.getMonth() + 1).padStart(2, '0')}월`
})

const calendarWeeks = computed(() => {
  const monthStart = new Date(localCalendarMonth.value.getFullYear(), localCalendarMonth.value.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayIndex)
      date.setHours(0, 0, 0, 0)
      return {
        key: formatIsoDate(date),
        date,
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === localCalendarMonth.value.getMonth(),
        isTuesday: date.getDay() === 2,
        isSelected: formatIsoDate(date) === String(localCalendarValue.value ?? ''),
      }
    }),
  )
})

const openCalendarDialog = () => {
  localCalendarValue.value = String(props.selectedTuesdayIso ?? '')
  syncCalendarMonth(localCalendarValue.value)
  isCalendarDialogOpen.value = true
}

const closeCalendarDialog = () => {
  isCalendarDialogOpen.value = false
}

const handleSearchInput = (value) => {
  localSearchText.value = value
}

const submitSearch = () => {
  emit('search-change', localSearchText.value)
}

const moveCalendarMonth = (delta) => {
  const base = localCalendarMonth.value
  localCalendarMonth.value = new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

const selectCalendarDate = (day) => {
  if (!day?.isTuesday) return
  localCalendarValue.value = day.key
  emit('select-tuesday', day.key)
  closeCalendarDialog()
}
</script>

<template>
  <section class="min-h-screen bg-white">
    <main class="w-full px-4 pb-5 md:px-6 md:pb-8">
      <div class="print-title-bar sticky top-[72px] z-20 -mx-4 border-b border-slate-200 bg-white px-4 py-2 md:-mx-6 md:px-6">
        <div class="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div>
          
            <h1 class="text-lg font-extrabold text-slate-900 md:text-xl">{{ pageTitle }}</h1>
          </div>
          <div class="print-hide flex flex-col gap-2 xl:items-end">
            <div class="flex flex-wrap items-center gap-2">
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" @click="emit('move-week', -1)">지난주</Button>
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" :disabled="weekOffset === 0" @click="emit('reset-week')">
                이번주
              </Button>
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" @click="emit('move-week', 1)">다음주</Button>
              <Button class="h-8 bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800 md:text-sm" @click="emit('go-register')">
                등록
              </Button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                @click="openCalendarDialog"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M3 10h18" />
                </svg>
              </button>
              <div class="relative min-w-[220px] flex-1 xl:w-[320px] xl:flex-none">
                <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400" stroke-width="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <Input
                  class="h-8 border-slate-200 pl-9 pr-3 text-xs md:text-sm"
                  :model-value="localSearchText"
                  placeholder="검색어를 입력해주세요"
                  @update:model-value="handleSearchInput"
                  @keydown.enter="submitSearch"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="isCalendarDialogOpen"
        class="print-hide fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
        @click.self="closeCalendarDialog"
      >
        <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-extrabold text-slate-900">검수일자 선택</h2>
            </div>
            <button type="button" class="text-slate-400 hover:text-slate-600" @click="closeCalendarDialog">닫기</button>
          </div>

          <div class="mt-4">
            <div class="mb-3 flex items-center justify-between">
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                @click="moveCalendarMonth(-1)"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <p class="text-sm font-extrabold text-slate-900">{{ calendarMonthLabel }}</p>
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                @click="moveCalendarMonth(1)"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-7 gap-1">
              <div
                v-for="label in calendarWeekLabels"
                :key="label"
                class="flex h-8 items-center justify-center text-xs font-bold text-slate-500"
              >
                {{ label }}
              </div>
              <button
                v-for="day in calendarWeeks.flat()"
                :key="day.key"
                type="button"
                class="flex h-11 items-center justify-center rounded-lg border text-sm transition"
                :class="[
                  day.isTuesday
                    ? day.isSelected
                      ? 'border-slate-900 bg-slate-900 font-extrabold text-white'
                      : 'border-blue-200 bg-blue-50 font-bold text-blue-700 hover:bg-blue-100'
                    : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300',
                  !day.isCurrentMonth && day.isTuesday ? 'opacity-45' : '',
                ]"
                :disabled="!day.isTuesday"
                @click="selectCalendarDate(day)"
              >
                {{ day.label }}
              </button>
            </div>

            <p class="mt-3 text-xs" :class="isCalendarTuesday ? 'text-slate-500' : 'font-bold text-red-600'">
              {{ isCalendarTuesday ? '파란색 화요일만 선택할 수 있습니다.' : '화요일 날짜만 선택해주세요.' }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="planLoading" class="py-16 text-center text-sm text-slate-500">데이터 로딩 중...</div>
      <div v-else-if="planError" class="py-16 text-center text-sm text-red-600">{{ planError }}</div>
      <div v-else-if="hasActiveSearch && visibleGroups.length === 0" class="py-16 text-center text-sm text-slate-500">검색 결과가 없습니다.</div>
      <div v-else class="mt-6 space-y-6">
        <MainProductionPlanGroupTable
          v-for="(groupData, groupIndex) in visibleGroups"
          :key="groupData.group"
          :group-data="groupData"
          :group-index="groupIndex"
          :overall-totals="overallTotals"
        />
      </div>
    </main>
  </section>
</template>

<style scoped>
@media print {
  .print-hide {
    display: none !important;
  }

  .print-title-bar {
    position: static !important;
    top: auto !important;
    margin: 0 0 12px 0 !important;
    padding: 0 0 12px 0 !important;
  }

  section,
  main {
    min-height: auto !important;
  }

  main {
    padding: 0 !important;
  }
}
</style>
