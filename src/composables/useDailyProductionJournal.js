import { computed, onUnmounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const PRODUCT_LIST_TABLE = 'product_list_test'
const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
const normalizeText = (value) => String(value ?? '').replaceAll(' ', '').trim()
const formatKoreanDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일`
}
const parseIsoDate = (value) => {
  const raw = String(value ?? '').trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, y, m, d] = match
  const next = new Date(Number(y), Number(m) - 1, Number(d))
  return Number.isNaN(next.getTime()) ? null : startOfDay(next)
}
const parseMonthDayDate = (value, baseDate = new Date()) => {
  const raw = String(value ?? '').trim()
  const match = raw.match(/^(\d{2})\.(\d{2})$/)
  if (!match) return null
  const [, m, d] = match
  const next = new Date(baseDate.getFullYear(), Number(m) - 1, Number(d))
  return Number.isNaN(next.getTime()) ? null : startOfDay(next)
}
const diffDaysInclusive = (startedOn, completedOn) => {
  const start = parseIsoDate(startedOn)
  const end = parseIsoDate(completedOn)
  if (!start || !end) return 0
  const diff = Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000))
  return diff >= 0 ? diff + 1 : 0
}
const getAllocatedQtyForDay = (qty, startedOn, completedOn, targetDate) => {
  const startedDate = parseIsoDate(startedOn)
  if (!startedDate) return 0
  const day = startOfDay(targetDate)
  const completedDate = parseIsoDate(completedOn)
  if (day.getTime() < startedDate.getTime()) return 0
  if (completedDate && day.getTime() > completedDate.getTime()) return 0
  const spanEnd = completedDate || day
  const spanDays = Math.max(1, Math.round((spanEnd.getTime() - startedDate.getTime()) / (24 * 3600 * 1000)) + 1)
  return qty / spanDays
}
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const isSameIsoDay = (value, targetDate) => {
  const parsed = parseIsoDate(value)
  return Boolean(parsed) && parsed.getTime() === startOfDay(targetDate).getTime()
}
const nextTuesday = (fromDate) => {
  const d = startOfDay(fromDate)
  const daysUntilTuesday = (2 - d.getDay() + 7) % 7
  d.setDate(d.getDate() + daysUntilTuesday)
  return d
}
const getWeekDates = (date) => {
  const base = startOfDay(date)
  const isoDow = Math.min(Math.max(base.getDay(), 1), 6)
  const monday = new Date(base)
  monday.setDate(base.getDate() - (isoDow - 1))
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}
const isDistributed = (row) =>
  String(row?.drawing_date ?? '').trim().length > 0 || Boolean(row?.virtual_drawing_distributed)
const resolveWorkTypeGroup = (value) => {
  const t = normalizeText(value)
  if (t === '용접/무용접') return 'welding'
  if (t === '전실/입상' || t === '전실입상') return 'hole'
  if (t === '나사') return 'nasa'
  return 'other'
}
const isTargetWorkType = (value) => resolveWorkTypeGroup(value) !== 'other'
const rowQty = (row) => {
  const group = resolveWorkTypeGroup(row?.work_type)
  if (group === 'hole') return toNumber(row?.hole)
  if (group === 'welding' || group === 'nasa') return toNumber(row?.head)
  return 0
}
const rowProcessSec = (row, setting) => {
  const group = resolveWorkTypeGroup(row?.work_type)
  if (group === 'welding') return setting.weldingHeadTimeSec
  if (group === 'hole') return setting.holeTimeSec
  if (group === 'nasa') return setting.nasaHeadTimeSec
  return 0
}
const formatHourMinute = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  if (h === 0 && m === 0) return '0분'
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

const stageMeta = [
  { key: 'marking_weld_a_status', label: '마킹1', groups: ['welding'], started: 'marking_weld_a_started_on', completed: 'marking_weld_a_completed_on' },
  { key: 'marking_weld_b_status', label: '마킹2', groups: ['welding'], started: 'marking_weld_b_started_on', completed: 'marking_weld_b_completed_on' },
  { key: 'marking_laser_1_status', label: '레이저1', groups: ['hole'], started: 'marking_laser_1_started_on', completed: 'marking_laser_1_completed_on' },
  { key: 'marking_laser_2_status', label: '레이저2', groups: ['hole'], started: 'marking_laser_2_started_on', completed: 'marking_laser_2_completed_on' },
  { key: 'beveling_status', label: '티&면치', groups: ['welding', 'hole', 'nasa'], started: 'beveling_started_on', completed: 'beveling_completed_on' },
  { key: 'main_status', label: '메인', groups: ['welding', 'hole', 'nasa'], started: 'main_started_on', completed: 'main_completed_on' },
  { key: 'nasa_status', label: '무용접', groups: ['nasa'], started: 'nasa_started_on', completed: 'nasa_completed_on' },
]
const processGroupMeta = [
  { key: 'marking', label: '마킹', subLabel: '', groups: ['welding'], stages: [stageMeta[0], stageMeta[1]], totalLabel: '총 헤드수', remainingLabel: '남은 헤드수' },
  { key: 'laser', label: '레이저', subLabel: '전실/입상', groups: ['hole'], stages: [stageMeta[2], stageMeta[3]], totalLabel: '총 홀수', remainingLabel: '남은 홀수' },
  { key: 'beveling', label: '티&면치', subLabel: '', groups: ['welding', 'hole', 'nasa'], stages: [stageMeta[4]], totalLabel: '총 헤드수/홀수', remainingLabel: '남은 헤드수/홀수' },
  { key: 'main', label: '메인', subLabel: '', groups: ['welding', 'hole', 'nasa'], stages: [stageMeta[5]], totalLabel: '총 헤드수/홀수', remainingLabel: '남은 헤드수/홀수' },
  { key: 'nasa', label: '무용접', subLabel: '', groups: ['nasa'], stages: [stageMeta[6]], totalLabel: '총 헤드수', remainingLabel: '남은 헤드수' },
]

export function useDailyProductionJournal(session) {
  const loading = ref(false)
  const error = ref('')
  const rowsByTestDate = ref({})
  const overtimeByTestDate = ref({})
  const selectedWorkDate = ref(new Date())
  const selectedTestDate = ref(nextTuesday(new Date()))
  const actualOvertimeInputMin = ref(0)
  const actualOvertimeNote = ref('')
  const setting = ref({
    weldingHeadTimeSec: 80,
    holeTimeSec: 80,
    nasaHeadTimeSec: 80,
  })
  let channel = null

  const fetchSetting = async () => {
    if (!session.value) return
    const { data } = await supabase
      .from('setting')
      .select('welding_head_time,hole_time,nasa_head_time')
      .limit(1)
      .maybeSingle()
    setting.value = {
      weldingHeadTimeSec: Math.max(1, toNumber(data?.welding_head_time) || 80),
      holeTimeSec: Math.max(1, toNumber(data?.hole_time) || 80),
      nasaHeadTimeSec: Math.max(1, toNumber(data?.nasa_head_time) || 80),
    }
  }

  const fetchRowsForCurrentTestDate = async () => {
    if (!session.value) {
      rowsByTestDate.value = {}
      return
    }
    loading.value = true
    error.value = ''
    const testDate = formatKoreanDate(selectedTestDate.value)
    const baseCols =
      'id,work_type,hole,head,drawing_date,delay_time,complete,complete_date,marking_weld_a_status,marking_weld_a_started_on,marking_weld_a_completed_on,marking_weld_b_status,marking_weld_b_started_on,marking_weld_b_completed_on,marking_laser_1_status,marking_laser_1_started_on,marking_laser_1_completed_on,marking_laser_2_status,marking_laser_2_started_on,marking_laser_2_completed_on,beveling_status,beveling_started_on,beveling_completed_on,main_status,main_started_on,main_completed_on,nasa_status,nasa_started_on,nasa_completed_on'
    const withVirtualCols = `${baseCols},virtual_drawing_distributed`
    const runQuery = (cols) => supabase.from(PRODUCT_LIST_TABLE).select(cols).eq('test_date', testDate)

    let { data, error: queryError } = await runQuery(withVirtualCols)
    if (queryError && String(queryError.message ?? '').includes('virtual_drawing_distributed')) {
      ;({ data, error: queryError } = await runQuery(baseCols))
    }
    loading.value = false
    if (queryError) {
      rowsByTestDate.value = {}
      error.value = `일지 조회 실패: ${queryError.message}`
      return
    }
    rowsByTestDate.value = {
      [testDate]: data ?? [],
    }
  }

  const fetchOvertimeLogs = async (workDates) => {
    if (!session.value) {
      overtimeByTestDate.value = {}
      return
    }
    const testDate = formatKoreanDate(selectedTestDate.value)
    const workDateTexts = workDates.map((d) => formatKoreanDate(d))
    const { data, error: queryError } = await supabase
      .from('production_overtime_logs')
      .select('test_date,work_date,actual_overtime_min,note')
      .eq('test_date', testDate)
      .in('work_date', workDateTexts)
    if (queryError) return
    const map = {}
    for (const wd of workDateTexts) map[wd] = { actualOvertimeMin: 0, note: '' }
    for (const row of data ?? []) {
      const wd = String(row?.work_date ?? '').trim()
      map[wd] = {
        actualOvertimeMin: Math.max(0, toNumber(row?.actual_overtime_min)),
        note: String(row?.note ?? ''),
      }
    }
    overtimeByTestDate.value = map
  }

  const stopRealtime = () => {
    channel?.unsubscribe()
    channel = null
  }
  const setupRealtime = () => {
    stopRealtime()
    if (!session.value) return
    channel = supabase
      .channel('daily-production-journal')
      .on('postgres_changes', { event: '*', schema: 'public', table: PRODUCT_LIST_TABLE }, async () => {
        await fetchRowsForCurrentTestDate()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'setting' }, async () => {
        await fetchSetting()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_overtime_logs' }, async () => {
        const workDates = getWeekDates(selectedWorkDate.value)
        await fetchOvertimeLogs(workDates)
      })
      .subscribe()
  }

  watch(
    [session, selectedTestDate, selectedWorkDate],
    async () => {
      const workDates = getWeekDates(selectedWorkDate.value)
      await fetchSetting()
      await fetchRowsForCurrentTestDate()
      await fetchOvertimeLogs(workDates)
      setupRealtime()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    stopRealtime()
  })

  const selectedTestDateText = computed(() => formatKoreanDate(selectedTestDate.value))
  const selectedRows = computed(() => rowsByTestDate.value[selectedTestDateText.value] ?? [])
  const distributedRows = computed(() =>
    selectedRows.value.filter((row) => isDistributed(row) && isTargetWorkType(row?.work_type)),
  )
  const selectedOvertime = computed(
    () => overtimeByTestDate.value[formatKoreanDate(selectedWorkDate.value)] ?? { actualOvertimeMin: 0, note: '' },
  )

  const computePlanMetrics = (rows, workDate = selectedWorkDate.value) => {
    const distributed = rows.filter((row) => isDistributed(row) && isTargetWorkType(row?.work_type))
    let totalQty = 0
    let completedQty = 0
    let weightedProcessSecSum = 0
    let pendingDelaySec = 0
    const targetDay = startOfDay(workDate)
    for (const row of distributed) {
      const qty = rowQty(row)
      if (qty <= 0) continue
      totalQty += qty
      weightedProcessSecSum += qty * rowProcessSec(row, setting.value)
      const completedOn = parseMonthDayDate(row?.complete_date, targetDay)
      if (Boolean(row?.complete) && completedOn && completedOn.getTime() <= targetDay.getTime()) completedQty += qty
      else pendingDelaySec += Math.max(0, toNumber(row?.delay_time))
    }
    const remainingQty = Math.max(0, totalQty - completedQty)
    const weekDates = getWeekDates(selectedWorkDate.value)
    const monday = weekDates[0]
    const saturday = weekDates[5]
    const today = startOfDay(new Date())
    const start = today >= monday && today <= saturday ? today : monday
    let workdays = 0
    const cursor = new Date(start)
    while (cursor <= saturday) {
      const dow = cursor.getDay()
      if (dow >= 1 && dow <= 6) workdays += 1
      cursor.setDate(cursor.getDate() + 1)
    }
    const workdaysForPlan = Math.max(1, workdays)
    const targetQty = Math.ceil(remainingQty / workdaysForPlan)
    const avgSec = totalQty > 0 ? weightedProcessSecSum / totalQty : setting.value.weldingHeadTimeSec
    const requiredSec = targetQty * avgSec + pendingDelaySec / workdaysForPlan
    return {
      remainingQty,
      workdaysForPlan,
      targetQty,
      requiredSec,
      autoOvertimeSec: Math.max(0, requiredSec - 9 * 3600),
    }
  }
  const computeAutoOvertimeSec = (rows, workDate = selectedWorkDate.value) => {
    return computePlanMetrics(rows, workDate).autoOvertimeSec
  }

  const summary = computed(() => {
    const allRows = selectedRows.value
    const distRows = distributedRows.value

    const totalHead = allRows.reduce((sum, row) => sum + toNumber(row?.head), 0)
    const totalHole = allRows.reduce((sum, row) => sum + toNumber(row?.hole), 0)
    const distributedHead = distRows.reduce((sum, row) => sum + toNumber(row?.head), 0)
    const distributedHole = distRows.reduce((sum, row) => sum + toNumber(row?.hole), 0)

    let dayDoneQty = 0
    let dayEstimatedQty = 0
    for (const proc of stageMeta) {
      for (const row of distRows) {
        const group = resolveWorkTypeGroup(row?.work_type)
        if (!proc.groups.includes(group)) continue
        const qty = rowQty(row)
        if (qty <= 0) continue
        dayEstimatedQty += getAllocatedQtyForDay(qty, row?.[proc.started], row?.[proc.completed], selectedWorkDate.value)
        if (isSameIsoDay(row?.[proc.completed], selectedWorkDate.value)) {
          dayDoneQty += qty
        }
      }
    }
    const todayPlan = computePlanMetrics(allRows, selectedWorkDate.value)
    const autoOvertimeSec = todayPlan.autoOvertimeSec
    const actualOvertimeSec = Math.max(0, toNumber(selectedOvertime.value.actualOvertimeMin) * 60)
    const achievementRate =
      autoOvertimeSec > 0
        ? Math.round((actualOvertimeSec / autoOvertimeSec) * 100)
        : actualOvertimeSec > 0
        ? 0
        : 100

    return {
      totalHead,
      totalHole,
      distributedHead,
      distributedHole,
      dayEstimatedQty: Math.round(dayEstimatedQty * 10) / 10,
      dayDoneQty,
      autoOvertimeText: formatHourMinute(autoOvertimeSec),
      actualOvertimeText: formatHourMinute(actualOvertimeSec),
      overtimeAchievementRate: achievementRate,
      overtimeAchievementRateText: `${achievementRate}%`,
    }
  })

  const processStats = computed(() =>
    processGroupMeta.map((proc) => {
      let targetQty = 0
      let estimatedTodayQty = 0
      let completedTodayQty = 0
      let cumulativeCompletedQty = 0
      let leadDaysSum = 0
      let leadDaysCount = 0
      for (const row of distributedRows.value) {
        const group = resolveWorkTypeGroup(row?.work_type)
        if (!proc.groups.includes(group)) continue
        const qty = rowQty(row)
        if (qty <= 0) continue
        targetQty += qty
        const estimatedQty = proc.stages.reduce(
          (max, stage) =>
            Math.max(
              max,
              getAllocatedQtyForDay(qty, row?.[stage.started], row?.[stage.completed], selectedWorkDate.value),
            ),
          0,
        )
        estimatedTodayQty += estimatedQty
        const completedToday = proc.stages.some((stage) => isSameIsoDay(row?.[stage.completed], selectedWorkDate.value))
        if (completedToday) {
          completedTodayQty += qty
          const leadDays = proc.stages.reduce((max, stage) => {
            const days = diffDaysInclusive(row?.[stage.started], row?.[stage.completed])
            return Math.max(max, days)
          }, 0)
          if (leadDays > 0) {
            leadDaysSum += leadDays
            leadDaysCount += 1
          }
        }
        const completedByDay = proc.stages.some((stage) => {
          const completedDate = parseIsoDate(row?.[stage.completed])
          return Boolean(completedDate) && completedDate.getTime() <= startOfDay(selectedWorkDate.value).getTime()
        })
        if (completedByDay) cumulativeCompletedQty += qty
      }
      const remainingQty = Math.max(0, targetQty - cumulativeCompletedQty)
      const completionRate = targetQty > 0 ? Math.round((cumulativeCompletedQty / targetQty) * 100) : 0
      const avgLeadDays = leadDaysCount > 0 ? (leadDaysSum / leadDaysCount).toFixed(1) : '-'
      return {
        key: proc.key,
        label: proc.label,
        subLabel: proc.subLabel,
        totalLabel: proc.totalLabel,
        remainingLabel: proc.remainingLabel,
        targetQty,
        estimatedTodayQty: Math.round(estimatedTodayQty * 10) / 10,
        completedTodayQty,
        remainingQty,
        completionRate,
        completedQty: cumulativeCompletedQty,
        avgLeadDaysText: avgLeadDays === '-' ? '-' : `${avgLeadDays}일`,
      }
    }),
  )

  const saveDailyActualOvertime = async () => {
    if (!session.value) return { ok: false, reason: 'no_session' }
    const testDate = selectedTestDateText.value
    const workDate = formatKoreanDate(selectedWorkDate.value)
    const minutes = Math.max(0, Math.floor(toNumber(actualOvertimeInputMin.value)))
    const note = String(actualOvertimeNote.value ?? '').trim()
    const { error: upsertError } = await supabase.from('production_overtime_logs').upsert(
      {
        test_date: testDate,
        work_date: workDate,
        actual_overtime_min: minutes,
        note,
      },
      { onConflict: 'test_date,work_date' },
    )
    if (upsertError) return { ok: false, reason: 'db_error', message: upsertError.message }
    overtimeByTestDate.value = {
      ...overtimeByTestDate.value,
      [workDate]: { actualOvertimeMin: minutes, note },
    }
    return { ok: true }
  }

  const selectedDateText = computed(() => formatKoreanDate(selectedWorkDate.value))
  const selectedWeekday = computed(() => ['일', '월', '화', '수', '목', '금', '토'][selectedWorkDate.value.getDay()])
  const selectedTestDateLabel = computed(() => formatKoreanDate(selectedTestDate.value))
  const moveDay = (delta) => {
    const next = new Date(selectedWorkDate.value)
    next.setDate(next.getDate() + delta)
    if (startOfDay(next).getTime() > startOfDay(new Date()).getTime()) return
    selectedWorkDate.value = next
  }
  const resetToday = () => {
    selectedWorkDate.value = new Date()
  }
  const moveTestWeek = (delta) => {
    const next = new Date(selectedTestDate.value)
    next.setDate(next.getDate() + delta * 7)
    selectedTestDate.value = next
  }
  const resetTestWeek = () => {
    selectedTestDate.value = nextTuesday(new Date())
  }
  const refresh = async () => {
    const workDates = getWeekDates(selectedWorkDate.value)
    await fetchRowsForCurrentTestDate()
    await fetchOvertimeLogs(workDates)
  }

  watch(
    selectedOvertime,
    (value) => {
      actualOvertimeInputMin.value = Math.max(0, toNumber(value?.actualOvertimeMin))
      actualOvertimeNote.value = String(value?.note ?? '')
    },
    { immediate: true },
  )

  return {
    loading,
    error,
    selectedDateText,
    selectedWeekday,
    selectedTestDateLabel,
    summary,
    processStats,
    actualOvertimeInputMin,
    actualOvertimeNote,
    saveDailyActualOvertime,
    refresh,
    moveDay,
    resetToday,
  }
}

