import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import {
  buildAllProcessSummaries,
  buildAllProcessWeeklyCompleted,
  buildDelayedItems,
  buildSummaryWeekColumns,
} from './buildDailyWorkSummary'
import { addDays, formatIsoDate, formatKoreanDate, getWeekDates, parseIsoDateParam, startOfDay } from './dates'
import { fetchDailyWorkRows } from './fetchDailyWorkRows'

function todayDate() {
  return startOfDay(new Date())
}

function resolveSelectedDate(queryDate) {
  const parsed = parseIsoDateParam(queryDate)
  const today = todayDate()
  if (!parsed) return today
  return parsed.getTime() > today.getTime() ? today : parsed
}

export function useDailyWorkSummary() {
  const { session } = useAuth()
  const route = useRoute()
  const router = useRouter()

  const loading = ref(false)
  const error = ref('')
  const rows = ref([])
  const selectedDate = ref(resolveSelectedDate(route.query.date))

  const pageTitle = computed(() => `${formatKoreanDate(selectedDate.value)} 작업일지 요약`)
  const canMoveNext = computed(() => selectedDate.value.getTime() < todayDate().getTime())
  const weekDates = computed(() => getWeekDates(selectedDate.value))
  const processSummaries = computed(() => buildAllProcessSummaries(rows.value, selectedDate.value))
  const weekColumns = computed(() => buildSummaryWeekColumns(weekDates.value, selectedDate.value))
  const weekProcesses = computed(() => buildAllProcessWeeklyCompleted(rows.value, weekDates.value))
  const delayedItems = computed(() => buildDelayedItems(processSummaries.value))

  async function loadRows() {
    if (!session.value) {
      rows.value = []
      return
    }

    loading.value = true
    error.value = ''
    try {
      rows.value = await fetchDailyWorkRows(selectedDate.value, weekDates.value)
    } catch (queryError) {
      rows.value = []
      error.value = queryError instanceof Error ? queryError.message : '작업일지 조회에 실패했습니다.'
    } finally {
      loading.value = false
    }
  }

  function syncDateQuery(date) {
    const nextDate = formatIsoDate(date)
    if (route.query.date === nextDate) return
    router.replace({ query: { ...route.query, date: nextDate } })
  }

  function moveDay(delta) {
    const nextDate = addDays(selectedDate.value, delta)
    if (nextDate.getTime() > todayDate().getTime()) return
    selectedDate.value = nextDate
    syncDateQuery(nextDate)
  }

  function resetToday() {
    const today = todayDate()
    selectedDate.value = today
    syncDateQuery(today)
  }

  watch(
    () => route.query.date,
    (queryDate) => {
      const nextDate = resolveSelectedDate(queryDate)
      if (nextDate.getTime() === selectedDate.value.getTime()) return
      selectedDate.value = nextDate
    },
  )

  watch(
    [session, selectedDate],
    () => {
      loadRows()
    },
    { immediate: true },
  )

  return {
    loading,
    error,
    selectedDate,
    pageTitle,
    canMoveNext,
    processSummaries,
    weekColumns,
    weekProcesses,
    delayedItems,
    moveDay,
    resetToday,
  }
}
