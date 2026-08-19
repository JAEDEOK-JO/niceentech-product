import { computed, ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { DAILY_WORK_TABS, getTabByKey } from './config'
import { buildDailyWorkLists, buildWeeklyCompletedQty, sumListInch, sumListQty } from './classify'
import { addDays, formatKoreanDate, getWeekDates, isSameDay, startOfDay } from './dates'
import { fetchDailyWorkRows } from './fetchDailyWorkRows'

function todayDate() {
  return startOfDay(new Date())
}

export function useDailyWorkJournal() {
  const { session } = useAuth()

  const loading = ref(false)
  const error = ref('')
  const rows = ref([])
  const activeTabKey = ref('branch')
  const selectedDate = ref(todayDate())

  const activeTab = computed(() => getTabByKey(activeTabKey.value))
  const pageTitle = computed(() => `${formatKoreanDate(selectedDate.value)} 작업일지`)
  const canMoveNext = computed(() => selectedDate.value.getTime() < todayDate().getTime())
  const weekDates = computed(() => getWeekDates(selectedDate.value))
  const lists = computed(() => buildDailyWorkLists(rows.value, activeTab.value, selectedDate.value))
  const weekCompleted = computed(() =>
    buildWeeklyCompletedQty(rows.value, activeTab.value, weekDates.value).map((item, index) => ({
      ...item,
      isSelected: isSameDay(weekDates.value[index], selectedDate.value),
    })),
  )
  const inProgressQty = computed(() => sumListQty(lists.value.inProgress))
  const completedQty = computed(() => sumListQty(lists.value.completed))
  const inProgressInch = computed(() => sumListInch(lists.value.inProgress))
  const completedInch = computed(() => sumListInch(lists.value.completed))

  async function loadRows() {
    if (!session.value) {
      rows.value = []
      return
    }

    loading.value = true
    error.value = ''
    try {
      rows.value = await fetchDailyWorkRows(selectedDate.value, getWeekDates(selectedDate.value))
    } catch (queryError) {
      rows.value = []
      error.value = queryError instanceof Error ? queryError.message : '작업일지 조회에 실패했습니다.'
    } finally {
      loading.value = false
    }
  }

  function moveDay(delta) {
    const nextDate = addDays(selectedDate.value, delta)
    if (nextDate.getTime() > todayDate().getTime()) return
    selectedDate.value = nextDate
  }

  function resetToday() {
    selectedDate.value = todayDate()
  }

  function setTab(key) {
    activeTabKey.value = key
  }

  watch(
    [session, selectedDate],
    () => {
      loadRows()
    },
    { immediate: true },
  )

  return {
    tabs: DAILY_WORK_TABS,
    loading,
    error,
    rows,
    activeTabKey,
    activeTab,
    selectedDate,
    pageTitle,
    lists,
    weekCompleted,
    inProgressQty,
    completedQty,
    inProgressInch,
    completedInch,
    moveDay,
    resetToday,
    canMoveNext,
    setTab,
    loadRows,
  }
}
