import { computed, onUnmounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const REGULAR_WORK_SECONDS = 9 * 60 * 60 // 08:00-17:00
const MAX_OVERTIME_SECONDS_WEEKDAY = 5 * 60 * 60 // 최대 5시간

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}
const normalizeText = (value) => String(value ?? '').replaceAll(' ', '').trim()
const normalizeProcessStatus = (value) => {
  const text = String(value ?? '').trim()
  if (text.includes('작업중')) return '작업중'
  if (text.includes('작업완료')) return '작업완료'
  if (!text || text === '없음') return '없음'
  return text
}
const isDoneStatus = (value) => {
  const status = normalizeProcessStatus(value)
  return status === '작업완료' || status === '없음'
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const isDistributed = (row) =>
  String(row?.drawing_date ?? '').trim().length > 0 || Boolean(row?.virtual_drawing_distributed)
const isAllProcessDone = (row) =>
  isDoneStatus(row?.marking_weld_a_status) &&
  isDoneStatus(row?.marking_weld_b_status) &&
  isDoneStatus(row?.marking_laser_1_status) &&
  isDoneStatus(row?.marking_laser_2_status) &&
  isDoneStatus(row?.nasa_status) &&
  isDoneStatus(row?.beveling_status) &&
  isDoneStatus(row?.main_status)

const formatHourMinute = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  if (h === 0 && m === 0) return '0분'
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

const countWeekdays = (from, to) => {
  if (from > to) return 0
  let count = 0
  const cursor = new Date(from)
  while (cursor <= to) {
    const day = cursor.getDay()
    if (day >= 1 && day <= 5) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export function useSchedulePlan({ session, selectedTuesday, planRows }) {
  const headTimeSec = ref(80)
  const holeTimeSec = ref(80)
  const summaryRows = ref([])
  let summaryChannel = null

  const formatKoreanDate = (date) => {
    const y = String(date.getFullYear()).padStart(4, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}년 ${m}월 ${d}일`
  }

  const fetchHeadTimeSetting = async () => {
    if (!session.value) return
    const { data } = await supabase
      .from('setting')
      .select('head_time,hole_time')
      .limit(1)
      .maybeSingle()

    const headValue = toNumber(data?.head_time)
    const holeValue = toNumber(data?.hole_time)
    headTimeSec.value = headValue > 0 ? headValue : 80
    holeTimeSec.value = holeValue > 0 ? holeValue : 80
  }

  watch(
    session,
    async () => {
      await fetchHeadTimeSetting()
    },
    { immediate: true },
  )

  const fetchSummaryRows = async () => {
    if (!session.value) {
      summaryRows.value = []
      return
    }

    const targetDate = formatKoreanDate(new Date(selectedTuesday.value))
    const baseColumns =
      'id,work_type,hole,head,drawing_date,delay_time,marking_weld_a_status,marking_weld_b_status,marking_laser_1_status,marking_laser_2_status,nasa_status,beveling_status,main_status'
    const withVirtualColumns = `${baseColumns},virtual_drawing_distributed`
    const runQuery = (columns) =>
      supabase
        .from('product_list')
        .select(columns)
        .eq('test_date', targetDate)

    let { data, error } = await runQuery(withVirtualColumns)
    if (error && String(error.message ?? '').includes('virtual_drawing_distributed')) {
      ;({ data, error } = await runQuery(baseColumns))
    }

    if (error) {
      summaryRows.value = []
      return
    }

    summaryRows.value = data ?? []
  }

  const stopSummaryRealtime = () => {
    summaryChannel?.unsubscribe()
    summaryChannel = null
  }

  const setupSummaryRealtime = () => {
    stopSummaryRealtime()
    if (!session.value) return

    summaryChannel = supabase
      .channel('schedule-summary-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_list' },
        async () => {
          await fetchSummaryRows()
        },
      )
      .subscribe()
  }

  watch(
    [session, selectedTuesday],
    async () => {
      await fetchSummaryRows()
      setupSummaryRealtime()
    },
    { immediate: true },
  )

  watch(
    () =>
      (planRows?.value ?? [])
        .map(
          (row) =>
            [
              row.id,
              row.drawing_date ?? '',
              row.virtual_drawing_distributed ? 1 : 0,
              row.delay_time ?? 0,
              row.head ?? 0,
              row.hole ?? 0,
              row.marking_weld_a_status ?? '',
              row.marking_weld_b_status ?? '',
              row.marking_laser_1_status ?? '',
              row.marking_laser_2_status ?? '',
              row.nasa_status ?? '',
              row.beveling_status ?? '',
              row.main_status ?? '',
            ].join(':'),
        )
        .join('|'),
    async () => {
      await fetchSummaryRows()
    },
  )

  onUnmounted(() => {
    stopSummaryRealtime()
  })

  const summary = computed(() => {
    const isHoleBased = (row) => {
      const workType = normalizeText(row?.work_type)
      return workType.includes('전실/입상') || workType.includes('전실입상')
    }
    const rowPlanQty = (row) => (isHoleBased(row) ? toNumber(row.hole) : toNumber(row.head))
    const rowProcessSec = (row) => (isHoleBased(row) ? holeTimeSec.value : headTimeSec.value)

    // 일정/야근 계산은 도면 배포 완료 건만 대상으로 한다.
    const sourceRows = summaryRows.value
    const distributedRows = sourceRows.filter(isDistributed)
    const totalDrawingCount = sourceRows.length
    const distributedDrawingCount = distributedRows.length
    const plannedTotalHead = sourceRows.reduce((sum, row) => sum + rowPlanQty(row), 0)
    let totalHead = 0
    let completedHead = 0
    let weightedProcessSecSum = 0
    let pendingDelaySec = 0

    for (const row of distributedRows) {
      const qty = rowPlanQty(row)
      totalHead += qty
      weightedProcessSecSum += qty * rowProcessSec(row)

      if (isAllProcessDone(row)) {
        completedHead += qty
      } else {
        pendingDelaySec += Math.max(0, toNumber(row?.delay_time))
      }
    }

    const remainingHead = Math.max(0, totalHead - completedHead)

    const tuesday = startOfDay(new Date(selectedTuesday.value))
    const monday = new Date(tuesday)
    monday.setDate(tuesday.getDate() - 1)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)

    const today = startOfDay(new Date())
    const isCurrentWeek = today >= monday && today <= friday
    const startDate = isCurrentWeek ? today : monday
    const workdaysForPlan = Math.max(1, countWeekdays(startDate, friday))

    const dailyTargetHead = Math.ceil(remainingHead / workdaysForPlan)
    const avgProcessSec = totalHead > 0 ? weightedProcessSecSum / totalHead : headTimeSec.value

    const requiredTodaySec = dailyTargetHead * avgProcessSec + pendingDelaySec / workdaysForPlan
    const todayOvertimeSecRaw = Math.max(0, requiredTodaySec - REGULAR_WORK_SECONDS)
    const todayOvertimeSec = Math.min(todayOvertimeSecRaw, MAX_OVERTIME_SECONDS_WEEKDAY)

    const requiredWeekSec = remainingHead * avgProcessSec + pendingDelaySec
    const regularWeekSec = workdaysForPlan * REGULAR_WORK_SECONDS
    const overtimeNeedWeekSec = Math.max(0, requiredWeekSec - regularWeekSec)
    const weekdayOvertimeCapacity = workdaysForPlan * MAX_OVERTIME_SECONDS_WEEKDAY
    const weekdayOvertimeSec = Math.min(overtimeNeedWeekSec, weekdayOvertimeCapacity)
    const afterWeekdayOvertime = Math.max(0, overtimeNeedWeekSec - weekdayOvertimeSec)

    const saturdayWork = afterWeekdayOvertime > 0
    const afterSaturday = Math.max(0, afterWeekdayOvertime - REGULAR_WORK_SECONDS)
    const sundayWork = afterSaturday > 0

    return {
      dailyTargetHead,
      completedHead,
      totalHead,
      remainingHead,
      plannedTotalHead,
      totalDrawingCount,
      distributedDrawingCount,
      todayOvertimeText: formatHourMinute(todayOvertimeSec),
      weeklyOvertimeText: formatHourMinute(weekdayOvertimeSec),
      saturdayWork: saturdayWork ? '출근' : '휴무',
      sundayWork: sundayWork ? '출근' : '휴무',
      headTimeSec: headTimeSec.value,
      holeTimeSec: holeTimeSec.value,
    }
  })

  return {
    scheduleSummary: summary,
  }
}
