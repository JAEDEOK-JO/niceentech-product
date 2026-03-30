import { computed, onUnmounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const PRODUCT_LIST_TABLE = 'product_list'
const OVERTIME_TABLE = 'production_line_overtime_logs'
const AVERAGE_STATS_CACHE_KEY = 'stats-weekly-average-v5'
const AVERAGE_STATS_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const AVERAGE_STATS_START_DATE = '2023년 01월 01일'
const DEFAULT_HEAD_UNIT_SEC = 50
const DEFAULT_HOLE_UNIT_SEC = 80
const DEFAULT_NASA_UNIT_SEC = 50
const REGULAR_WORK_SEC = 8 * 3600
const TUESDAY_DEADLINE_WORK_SEC = 2 * 3600
const WEEKDAY_OVERTIME_MAX_SEC = 3.5 * 3600
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const LINE_DEFS = [
  { key: 'branch_head', title: '헤드', quantityLabel: '수량', accent: 'emerald' },
  { key: 'main_hole', title: '홀', quantityLabel: '수량', accent: 'cyan' },
]
const EXCLUDED_CURRENT_STATS_WORK_TYPES = new Set(['나사'])

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const formatKoreanDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}년 ${m}월 ${day}일`
}
const formatMonthDay = (date) =>
  `${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`
const formatYearMonth = (date) =>
  `${String(date.getFullYear()).padStart(4, '0')}년 ${String(date.getMonth() + 1).padStart(2, '0')}월`
const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
const formatHourMinute = (seconds) => {
  const safe = Math.max(0, Math.round(Number(seconds) || 0))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  if (h === 0 && m === 0) return '0분'
  if (m === 0) return `${h}시간`
  if (h === 0) return `${m}분`
  return `${h}시간 ${m}분`
}
const formatQty = (value, unit = '개') => `${Number(value || 0).toLocaleString('ko-KR')}${unit}`
const normalizeWorkType = (value) => String(value ?? '').replaceAll(' ', '').trim()
const isIncludedCurrentStatsWorkType = (value) => !EXCLUDED_CURRENT_STATS_WORK_TYPES.has(normalizeWorkType(value))
const isDistributed = (row) =>
  String(row?.drawing_date ?? '').trim().length > 0 || Boolean(row?.virtual_drawing_distributed)
const parseMonthDayDate = (value, baseDate = new Date()) => {
  const raw = String(value ?? '').trim()
  const match = raw.match(/^(\d{2})\.(\d{2})$/)
  if (!match) return null
  const [, month, day] = match
  const next = new Date(baseDate.getFullYear(), Number(month) - 1, Number(day))
  return Number.isNaN(next.getTime()) ? null : startOfDay(next)
}
const isCompletedByDate = (row, targetDate) => {
  if (!Boolean(row?.complete) && !Boolean(row?.shipment)) return false
  const completedDate = parseMonthDayDate(row?.complete_date, targetDate)
  if (!completedDate) return true
  return completedDate.getTime() <= startOfDay(targetDate).getTime()
}
const resolveTestTuesday = (fromDate) => {
  const d = startOfDay(fromDate)
  const day = d.getDay()
  const daysUntilTuesday = day <= 2 ? 2 - day : 9 - day
  d.setDate(d.getDate() + daysUntilTuesday)
  return d
}
const isSameDay = (left, right) => startOfDay(left).getTime() === startOfDay(right).getTime()
const getScheduleDates = (startDate, endDate) => {
  const dates = []
  const cursor = startOfDay(startDate)
  const deadline = startOfDay(endDate)
  while (cursor.getTime() <= deadline.getTime()) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}
const getScheduleDatesByTestDate = (testDate) => getScheduleDates(addDays(testDate, -6), testDate)
const getRegularWorkSecForDate = (date, deadlineDate) => {
  if (isSameDay(date, deadlineDate) && date.getDay() === 2) return TUESDAY_DEADLINE_WORK_SEC
  return REGULAR_WORK_SEC
}
const getOvertimeCapSecForDate = (date, deadlineDate) => {
  const day = date.getDay()
  if (isSameDay(date, deadlineDate) && day === 2) return 0
  return day >= 1 && day <= 5 ? WEEKDAY_OVERTIME_MAX_SEC : 0
}
const buildWeekendRequirementMap = (scheduleDates, deadlineDate, weekendRequiredSec) => {
  const map = {}
  let remaining = weekendRequiredSec
  for (const date of scheduleDates) {
    const day = date.getDay()
    if (day !== 0 && day !== 6) continue
    const available = getRegularWorkSecForDate(date, deadlineDate)
    const assigned = Math.min(available, remaining)
    map[formatKoreanDate(date)] = assigned
    remaining -= assigned
  }
  return map
}
const buildMetricPlan = (totalQty, unitSec, totalRequiredSec, scheduleDates, deadlineDate) => {
  const scheduleMeta = scheduleDates.map((date) => {
    const day = date.getDay()
    const regularSec = getRegularWorkSecForDate(date, deadlineDate)
    const overtimeCapSec = getOvertimeCapSecForDate(date, deadlineDate)
    return {
      date,
      isWeekend: day === 0 || day === 6,
      regularSec,
      overtimeCapSec,
    }
  })
  const weekdayRegularTotalSec = scheduleMeta
    .filter((item) => !item.isWeekend)
    .reduce((sum, item) => sum + item.regularSec, 0)
  const weekdayOvertimeCapTotalSec = scheduleMeta.reduce((sum, item) => sum + item.overtimeCapSec, 0)
  const weekdayRequiredOvertimeTotalSec = Math.min(
    Math.max(0, totalRequiredSec - weekdayRegularTotalSec),
    weekdayOvertimeCapTotalSec,
  )
  const overtimeEligibleDayCount = scheduleMeta.filter((item) => item.overtimeCapSec > 0).length
  const weekdayDailyRequiredOvertimeSec =
    overtimeEligibleDayCount > 0
      ? Math.min(WEEKDAY_OVERTIME_MAX_SEC, Math.ceil(weekdayRequiredOvertimeTotalSec / overtimeEligibleDayCount))
      : 0
  const weekendRequiredSec = Math.max(0, totalRequiredSec - weekdayRegularTotalSec - weekdayOvertimeCapTotalSec)
  return {
    regularDayQty: Math.floor(REGULAR_WORK_SEC / unitSec),
    weekdayRequiredOvertimeTotalSec,
    weekdayDailyRequiredOvertimeSec,
    weekendRequiredSec,
    weekendNeeded: weekendRequiredSec > 0,
    weekendRequirementMap: buildWeekendRequirementMap(scheduleDates, deadlineDate, weekendRequiredSec),
  }
}
const createLineInputState = () => ({
  branch_head: {
    actualOvertimeInputMin: 0,
    actualOvertimeNote: '',
    isNoOvertimeChecked: false,
    delayInputMin: 0,
    delayReason: '',
  },
  main_hole: {
    actualOvertimeInputMin: 0,
    actualOvertimeNote: '',
    isNoOvertimeChecked: false,
    delayInputMin: 0,
    delayReason: '',
  },
})
const createEmptyLineEntry = () => ({
  actualOvertimeMin: 0,
  note: '',
  delayMin: 0,
  delayReason: '',
  saved: false,
})
const parseStoredNote = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return { overtimeNote: '', delayMin: 0, delayReason: '' }
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw)
      return {
        overtimeNote: String(parsed?.overtimeNote ?? ''),
        delayMin: Math.max(0, toNumber(parsed?.delayMin)),
        delayReason: String(parsed?.delayReason ?? ''),
      }
    } catch {
      return { overtimeNote: raw, delayMin: 0, delayReason: '' }
    }
  }
  return { overtimeNote: raw, delayMin: 0, delayReason: '' }
}
const serializeStoredNote = ({ overtimeNote, delayMin, delayReason }) => {
  const safeOvertimeNote = String(overtimeNote ?? '').trim()
  const safeDelayMin = Math.max(0, Math.floor(toNumber(delayMin)))
  const safeDelayReason = String(delayReason ?? '').trim()
  if (!safeDelayMin && !safeDelayReason) return safeOvertimeNote
  return JSON.stringify({
    overtimeNote: safeOvertimeNote,
    delayMin: safeDelayMin,
    delayReason: safeDelayReason,
  })
}
const createEmptyAverageStats = () => ({
  periodText: `${formatYearMonth(new Date(2023, 0, 1))} ~ ${formatYearMonth(new Date())}`,
  weeksCount: 0,
  avgHeadQty: 0,
  avgHoleQty: 0,
  avgGrooveQty: 0,
  cachedAtText: '',
})
const formatCacheStamp = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${d} ${hh}:${mm}`
}
const readAverageStatsCache = () => {
  try {
    const raw = globalThis?.localStorage?.getItem(AVERAGE_STATS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}
const writeAverageStatsCache = (value) => {
  try {
    globalThis?.localStorage?.setItem(AVERAGE_STATS_CACHE_KEY, JSON.stringify(value))
  } catch {
    // ignore cache write errors
  }
}
const buildLineTotals = (rows, setting, lineKey) => {
  if (lineKey === 'branch_head') {
    return rows.reduce(
      (acc, row) => {
        const workType = normalizeWorkType(row?.work_type)
        const qty = toNumber(row?.head)
        if (qty <= 0) return acc
        const unitSec = workType === '나사' ? setting.nasaHeadTimeSec : setting.weldingHeadTimeSec
        acc.qty += qty
        acc.requiredSec += qty * unitSec
        return acc
      },
      { qty: 0, requiredSec: 0 },
    )
  }
  if (lineKey === 'main_hole') {
    return rows.reduce(
      (acc, row) => {
        const qty = toNumber(row?.hole)
        if (qty <= 0) return acc
        acc.qty += qty
        acc.requiredSec += qty * setting.holeTimeSec
        return acc
      },
      { qty: 0, requiredSec: 0 },
    )
  }
  return { qty: 0, requiredSec: 0 }
}

export function useDailyProductionJournal(session) {
  const loading = ref(false)
  const error = ref('')
  const rowsByTestDate = ref({})
  const overtimeByWorkDate = ref({})
  const averageStats = ref(createEmptyAverageStats())
  const selectedTestDate = ref(resolveTestTuesday(new Date()))
  const selectedInputDate = ref(new Date())
  const lineInputState = ref(createLineInputState())
  const setting = ref({
    weldingHeadTimeSec: DEFAULT_HEAD_UNIT_SEC,
    holeTimeSec: DEFAULT_HOLE_UNIT_SEC,
    nasaHeadTimeSec: DEFAULT_NASA_UNIT_SEC,
  })
  let channel = null

  const selectedTestDateText = computed(() => formatKoreanDate(selectedTestDate.value))
  const scheduleDates = computed(() => getScheduleDatesByTestDate(selectedTestDate.value))
  const remainingScheduleDates = computed(() => getScheduleDates(selectedInputDate.value, selectedTestDate.value))
  const selectedWorkDateText = computed(() => formatKoreanDate(selectedInputDate.value))
  const selectedWeekRangeText = computed(
    () => `${formatMonthDay(scheduleDates.value[0])} ~ ${formatMonthDay(scheduleDates.value[scheduleDates.value.length - 1])}`,
  )
  const selectedDateOptions = computed(() =>
    scheduleDates.value.map((date) => ({
      value: formatKoreanDate(date),
      label: `${formatMonthDay(date)} (${WEEKDAY_LABELS[date.getDay()]})`,
    })),
  )

  const fetchSetting = async () => {
    if (!session.value) return
    const { data } = await supabase
      .from('setting')
      .select('welding_head_time,hole_time,nasa_head_time')
      .limit(1)
      .maybeSingle()
    setting.value = {
      weldingHeadTimeSec: Math.max(1, toNumber(data?.welding_head_time) || DEFAULT_HEAD_UNIT_SEC),
      holeTimeSec: Math.max(1, toNumber(data?.hole_time) || DEFAULT_HOLE_UNIT_SEC),
      nasaHeadTimeSec: Math.max(1, toNumber(data?.nasa_head_time) || DEFAULT_NASA_UNIT_SEC),
    }
  }
  const fetchAverageStats = async ({ force = false } = {}) => {
    if (!session.value) {
      averageStats.value = createEmptyAverageStats()
      return
    }
    const cached = readAverageStatsCache()
    const now = Date.now()
    if (!force && cached?.fetchedAt && now - Number(cached.fetchedAt) < AVERAGE_STATS_CACHE_TTL_MS && cached?.data) {
      averageStats.value = cached.data
      return
    }

    const batchSize = 1000
    const grouped = {}
    let from = 0
    let hasMore = true

    while (hasMore) {
      const to = from + batchSize - 1
      const { data, error: queryError } = await supabase
        .from(PRODUCT_LIST_TABLE)
        .select('test_date,work_type,head,hole,groove')
        .gte('test_date', AVERAGE_STATS_START_DATE)
        .order('id', { ascending: true })
        .range(from, to)

      if (queryError) {
        if (cached?.data) {
          averageStats.value = cached.data
          return
        }
        averageStats.value = createEmptyAverageStats()
        return
      }

      const rows = data ?? []
      for (const row of rows) {
        const testDate = String(row?.test_date ?? '').trim()
        if (!testDate) continue
        if (!grouped[testDate]) grouped[testDate] = { headQty: 0, holeQty: 0, grooveQty: 0 }
        grouped[testDate].headQty += toNumber(row?.head)
        grouped[testDate].holeQty += toNumber(row?.hole)
        grouped[testDate].grooveQty += toNumber(row?.groove)
      }

      hasMore = rows.length === batchSize
      from += batchSize
    }

    const weekEntries = Object.values(grouped)
    const weeksCount = weekEntries.length
    const totalHeadQty = weekEntries.reduce((sum, item) => sum + toNumber(item.headQty), 0)
    const totalHoleQty = weekEntries.reduce((sum, item) => sum + toNumber(item.holeQty), 0)
    const totalGrooveQty = weekEntries.reduce((sum, item) => sum + toNumber(item.grooveQty), 0)
    const nextStats = {
      periodText: `${formatYearMonth(new Date(2023, 0, 1))} ~ ${formatYearMonth(new Date())}`,
      weeksCount,
      avgHeadQty: weeksCount > 0 ? Math.round(totalHeadQty / weeksCount) : 0,
      avgHoleQty: weeksCount > 0 ? Math.round(totalHoleQty / weeksCount) : 0,
      avgGrooveQty: weeksCount > 0 ? Math.round(totalGrooveQty / weeksCount) : 0,
      cachedAtText: formatCacheStamp(now),
    }
    averageStats.value = nextStats
    writeAverageStatsCache({ fetchedAt: now, data: nextStats })
  }

  const fetchRowsForCurrentTestDate = async () => {
    if (!session.value) {
      rowsByTestDate.value = {}
      return
    }
    loading.value = true
    error.value = ''
    const testDate = selectedTestDateText.value
    const baseCols = 'id,work_type,head,hole,drawing_date,complete,complete_date,shipment'
    const withVirtualCols = `${baseCols},virtual_drawing_distributed`
    const runQuery = (cols) => supabase.from(PRODUCT_LIST_TABLE).select(cols).eq('test_date', testDate)
    let { data, error: queryError } = await runQuery(withVirtualCols)
    if (queryError && String(queryError.message ?? '').includes('virtual_drawing_distributed')) {
      ;({ data, error: queryError } = await runQuery(baseCols))
    }
    loading.value = false
    if (queryError) {
      rowsByTestDate.value = {}
      error.value = `통계 조회 실패: ${queryError.message}`
      return
    }
    rowsByTestDate.value = { [testDate]: (data ?? []).filter((row) => isIncludedCurrentStatsWorkType(row?.work_type)) }
  }

  const fetchOvertimeLogs = async () => {
    if (!session.value) {
      overtimeByWorkDate.value = {}
      return
    }
    const testDate = selectedTestDateText.value
    const workDateTexts = scheduleDates.value.map((date) => formatKoreanDate(date))
    const { data, error: queryError } = await supabase
      .from(OVERTIME_TABLE)
      .select('test_date,work_date,line_type,actual_overtime_min,note')
      .eq('test_date', testDate)
      .in('work_date', workDateTexts)

    if (queryError) return
    const nextMap = {}
    for (const workDate of workDateTexts) {
      nextMap[workDate] = {
        branch_head: createEmptyLineEntry(),
        main_hole: createEmptyLineEntry(),
      }
    }
    for (const row of data ?? []) {
      const workDate = String(row?.work_date ?? '').trim()
      const lineType = String(row?.line_type ?? '').trim()
      if (!nextMap[workDate] || !nextMap[workDate][lineType]) continue
      const parsedNote = parseStoredNote(row?.note)
      nextMap[workDate][lineType] = {
        actualOvertimeMin: Math.max(0, toNumber(row?.actual_overtime_min)),
        note: parsedNote.overtimeNote,
        delayMin: parsedNote.delayMin,
        delayReason: parsedNote.delayReason,
        saved: true,
      }
    }
    overtimeByWorkDate.value = nextMap
  }

  const stopRealtime = () => {
    channel?.unsubscribe()
    channel = null
  }
  const setupRealtime = () => {
    stopRealtime()
    if (!session.value) return
    channel = supabase
      .channel('weekly-production-check')
      .on('postgres_changes', { event: '*', schema: 'public', table: PRODUCT_LIST_TABLE }, async () => {
        await fetchRowsForCurrentTestDate()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'setting' }, async () => {
        await fetchSetting()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: OVERTIME_TABLE }, async () => {
        await fetchOvertimeLogs()
      })
      .subscribe()
  }

  watch(
    [session, selectedTestDateText],
    async () => {
      await fetchSetting()
      await fetchAverageStats()
      await fetchRowsForCurrentTestDate()
      await fetchOvertimeLogs()
      setupRealtime()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    stopRealtime()
  })

  const selectedRows = computed(() => rowsByTestDate.value[selectedTestDateText.value] ?? [])
  const distributedRows = computed(() => selectedRows.value.filter((row) => isDistributed(row)))
  const completedDistributedRows = computed(() =>
    distributedRows.value.filter((row) => isCompletedByDate(row, selectedInputDate.value)),
  )
  const remainingDistributedRows = computed(() =>
    distributedRows.value.filter((row) => !isCompletedByDate(row, selectedInputDate.value)),
  )
  const pendingRows = computed(() => selectedRows.value.filter((row) => !isDistributed(row)))
  const getRemainingDistributedRowsForDate = (targetDate) =>
    distributedRows.value.filter((row) => !isCompletedByDate(row, targetDate))

  const lineMetrics = computed(() =>
    LINE_DEFS.reduce((acc, line) => {
      const total = buildLineTotals(selectedRows.value, setting.value, line.key)
      const distributed = buildLineTotals(distributedRows.value, setting.value, line.key)
      const completed = buildLineTotals(completedDistributedRows.value, setting.value, line.key)
      const remaining = buildLineTotals(remainingDistributedRows.value, setting.value, line.key)
      const pending = buildLineTotals(pendingRows.value, setting.value, line.key)
      const unitSec = remaining.qty > 0 ? Math.round(remaining.requiredSec / remaining.qty) : line.key === 'branch_head'
        ? setting.value.weldingHeadTimeSec
        : setting.value.holeTimeSec
      const plan = buildMetricPlan(
        remaining.qty,
        Math.max(1, unitSec),
        remaining.requiredSec,
        remainingScheduleDates.value,
        selectedTestDate.value,
      )
      const actualWeekdayOvertimeTotalSec = remainingScheduleDates.value.reduce((sum, date) => {
        if (getOvertimeCapSecForDate(date, selectedTestDate.value) <= 0) return sum
        const entry = overtimeByWorkDate.value[formatKoreanDate(date)]?.[line.key]
        return sum + Math.max(0, toNumber(entry?.actualOvertimeMin) * 60)
      }, 0)
      const matchRate =
        plan.weekdayRequiredOvertimeTotalSec > 0
          ? Math.round((actualWeekdayOvertimeTotalSec / plan.weekdayRequiredOvertimeTotalSec) * 100)
          : actualWeekdayOvertimeTotalSec > 0
          ? 0
          : 100
      acc[line.key] = {
        ...line,
        totalQty: total.qty,
        distributedQty: distributed.qty,
        completedQty: completed.qty,
        remainingQty: remaining.qty,
        pendingQty: pending.qty,
        unitSec,
        plan,
        actualWeekdayOvertimeTotalSec,
        matchRate,
      }
      return acc
    }, {}),
  )

  const summary = computed(() => ({
    weekRangeText: selectedWeekRangeText.value,
    deadlineText: `${selectedTestDateText.value} 10시`,
    average: {
      periodText: averageStats.value.periodText,
      weeksCountText: `${Number(averageStats.value.weeksCount || 0).toLocaleString('ko-KR')}주`,
      avgHeadQtyText: formatQty(averageStats.value.avgHeadQty),
      avgHoleQtyText: formatQty(averageStats.value.avgHoleQty),
      avgGrooveQtyText: formatQty(averageStats.value.avgGrooveQty),
      cachedAtText: averageStats.value.cachedAtText,
    },
    lines: LINE_DEFS.map((line) => {
      const metric = lineMetrics.value[line.key]
      return {
        key: line.key,
        title: line.title,
        quantityLabel: line.quantityLabel,
        accent: line.accent,
        totalQtyText: formatQty(metric.totalQty),
        remainingQtyText: formatQty(metric.remainingQty),
        completedQtyText: formatQty(metric.completedQty),
        heroQtyText: `${Number(metric.remainingQty || 0).toLocaleString('ko-KR')} / ${Number(metric.totalQty || 0).toLocaleString('ko-KR')}개`,
        heroQtyLabel: '남은 / 전체',
        distributedQtyText: formatQty(metric.distributedQty),
        pendingQtyText: formatQty(metric.pendingQty),
        unitSecText: `${metric.unitSec}초/개`,
        regularDayQtyText: formatQty(metric.plan.regularDayQty),
        calculatedOvertimeText: formatHourMinute(metric.plan.weekdayDailyRequiredOvertimeSec),
        actualOvertimeText: formatHourMinute(metric.actualWeekdayOvertimeTotalSec),
        matchRateText: `${metric.matchRate}%`,
        weekendText: metric.plan.weekendNeeded ? '필요' : '불필요',
      }
    }),
  }))

  const weekdayPlanRows = computed(() =>
    scheduleDates.value.map((date) => {
      const workDateText = formatKoreanDate(date)
      const day = date.getDay()
      const isWeekend = day === 0 || day === 6
      const isDeadlineTuesday = isSameDay(date, selectedTestDate.value) && day === 2
      const remainingRowsForDate = getRemainingDistributedRowsForDate(date)
      const scheduleDatesFromCurrentDate = getScheduleDates(date, selectedTestDate.value)
      const lineRows = LINE_DEFS.reduce((acc, line) => {
        const remaining = buildLineTotals(remainingRowsForDate, setting.value, line.key)
        const unitSec = remaining.qty > 0
          ? Math.round(remaining.requiredSec / remaining.qty)
          : line.key === 'branch_head'
          ? setting.value.weldingHeadTimeSec
          : setting.value.holeTimeSec
        const plan = buildMetricPlan(
          remaining.qty,
          Math.max(1, unitSec),
          remaining.requiredSec,
          scheduleDatesFromCurrentDate,
          selectedTestDate.value,
        )
        const entry = overtimeByWorkDate.value[workDateText]?.[line.key] ?? createEmptyLineEntry()
        const actualOvertimeSec = Math.max(0, toNumber(entry.actualOvertimeMin) * 60)
        const requiredOvertimeSec =
          getOvertimeCapSecForDate(date, selectedTestDate.value) > 0 ? plan.weekdayDailyRequiredOvertimeSec : 0
        const delayText =
          entry.delayMin > 0
            ? `${formatHourMinute(entry.delayMin * 60)}${entry.delayReason ? ` · ${entry.delayReason}` : ''}`
            : entry.delayReason
            ? entry.delayReason
            : ''
        const baseNote = isWeekend
          ? plan.weekendRequirementMap[workDateText]
            ? '정시 작업 필요'
            : '주말 작업 불필요'
          : isDeadlineTuesday
          ? '화요일 10시 마감'
          : requiredOvertimeSec <= 0
          ? '정시 작업 가능'
          : !entry.saved
          ? '미입력'
          : actualOvertimeSec >= requiredOvertimeSec
          ? '충족'
          : '부족'
        acc[line.key] = {
          calculatedText: requiredOvertimeSec > 0 ? formatHourMinute(requiredOvertimeSec) : '정시 작업 가능',
          actualText: !entry.saved ? '' : actualOvertimeSec <= 0 ? '야근없음' : formatHourMinute(actualOvertimeSec),
          note: baseNote,
          delayText,
          tone:
            !entry.saved || requiredOvertimeSec <= 0
              ? 'text-slate-500'
              : actualOvertimeSec >= requiredOvertimeSec
              ? 'text-emerald-700'
              : 'text-amber-700',
        }
        return acc
      }, {})
      const delaySummaryParts = []
      if (lineRows.branch_head.delayText) delaySummaryParts.push(lineRows.branch_head.delayText)
      if (lineRows.main_hole.delayText) delaySummaryParts.push(lineRows.main_hole.delayText)
      return {
        key: workDateText,
        dateText: `${formatMonthDay(date)} (${WEEKDAY_LABELS[day]})`,
        delaySummaryText: delaySummaryParts.join(' / '),
        isSelected: workDateText === selectedWorkDateText.value,
        branch: lineRows.branch_head,
        main: lineRows.main_hole,
      }
    }),
  )

  const lineInputs = computed(() => lineInputState.value)
  const selectedLineEntries = computed(() => {
    const key = selectedWorkDateText.value
    return (
      overtimeByWorkDate.value[key] ?? {
        branch_head: createEmptyLineEntry(),
        main_hole: createEmptyLineEntry(),
      }
    )
  })

  const syncLineInputState = (entries) => {
    const next = createLineInputState()
    for (const line of LINE_DEFS) {
      const entry = entries?.[line.key] ?? createEmptyLineEntry()
      next[line.key] = {
        actualOvertimeInputMin: Math.max(0, toNumber(entry.actualOvertimeMin)),
        actualOvertimeNote: String(entry.note ?? ''),
        isNoOvertimeChecked: Boolean(entry.saved) && Math.max(0, toNumber(entry.actualOvertimeMin)) === 0,
        delayInputMin: Math.max(0, toNumber(entry.delayMin)),
        delayReason: String(entry.delayReason ?? ''),
      }
    }
    lineInputState.value = next
  }

  const saveDailyActualOvertime = async (lineType) => {
    if (!session.value) return { ok: false, reason: 'no_session' }
    const state = lineInputState.value[lineType]
    if (!state) return { ok: false, reason: 'invalid_line' }
    const testDate = selectedTestDateText.value
    const workDate = selectedWorkDateText.value
    const minutes = state.isNoOvertimeChecked ? 0 : Math.max(0, Math.floor(toNumber(state.actualOvertimeInputMin)))
    const note = serializeStoredNote({
      overtimeNote: state.actualOvertimeNote,
      delayMin: state.delayInputMin,
      delayReason: state.delayReason,
    })
    const { error: upsertError } = await supabase.from(OVERTIME_TABLE).upsert(
      {
        test_date: testDate,
        work_date: workDate,
        line_type: lineType,
        actual_overtime_min: minutes,
        note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'test_date,work_date,line_type' },
    )
    if (upsertError) return { ok: false, reason: 'db_error', message: upsertError.message }
    overtimeByWorkDate.value = {
      ...overtimeByWorkDate.value,
      [workDate]: {
        ...(overtimeByWorkDate.value[workDate] ?? {
          branch_head: createEmptyLineEntry(),
          main_hole: createEmptyLineEntry(),
        }),
        [lineType]: {
          actualOvertimeMin: minutes,
          note: String(state.actualOvertimeNote ?? '').trim(),
          delayMin: Math.max(0, Math.floor(toNumber(state.delayInputMin))),
          delayReason: String(state.delayReason ?? '').trim(),
          saved: true,
        },
      },
    }
    return { ok: true }
  }

  const selectedDateText = computed(() => selectedWorkDateText.value)
  const selectedWeekday = computed(() => WEEKDAY_LABELS[selectedInputDate.value.getDay()])
  const selectedTestDateLabel = computed(() => selectedTestDateText.value)
  const canMoveNextDay = computed(
    () => startOfDay(selectedTestDate.value).getTime() < startOfDay(resolveTestTuesday(new Date())).getTime(),
  )
  const moveDay = (delta) => {
    const next = new Date(selectedTestDate.value)
    next.setDate(next.getDate() + delta * 7)
    if (startOfDay(next).getTime() > startOfDay(resolveTestTuesday(new Date())).getTime()) return
    selectedTestDate.value = next
  }
  const resetToday = () => {
    selectedTestDate.value = resolveTestTuesday(new Date())
  }
  const updateSelectedInputDate = (value) => {
    const matched = scheduleDates.value.find((date) => formatKoreanDate(date) === String(value ?? ''))
    if (matched) selectedInputDate.value = matched
  }
  const refresh = async () => {
    await fetchAverageStats({ force: true })
    await fetchRowsForCurrentTestDate()
    await fetchOvertimeLogs()
  }

  watch(
    scheduleDates,
    (dates) => {
      const todayText = formatKoreanDate(new Date())
      const currentSelectedText = formatKoreanDate(selectedInputDate.value)
      const preferred =
        dates.find((date) => formatKoreanDate(date) === todayText) ||
        dates.find((date) => formatKoreanDate(date) === currentSelectedText) ||
        dates[0]
      if (preferred) selectedInputDate.value = preferred
    },
    { immediate: true },
  )

  watch(
    selectedLineEntries,
    (entries) => {
      syncLineInputState(entries)
    },
    { immediate: true },
  )

  return {
    loading,
    error,
    selectedDateText,
    selectedWeekday,
    selectedTestDateLabel,
    selectedDateOptions,
    canMoveNextDay,
    summary,
    weekdayPlanRows,
    lineInputs,
    updateSelectedInputDate,
    saveDailyActualOvertime,
    refresh,
    moveDay,
    resetToday,
  }
}

