import { computed, onUnmounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const PRODUCT_LIST_TABLE = 'product_list'
const REGULAR_WORK_SECONDS = 9 * 60 * 60
const MAX_OVERTIME_SECONDS_WEEKDAY = 5 * 60 * 60

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
const normalizeText = (value) => String(value ?? '').replaceAll(' ', '').trim()
const resolveWorkTypeGroup = (value) => {
  const workType = normalizeText(value)
  if (workType === '용접/무용접') return 'welding'
  if (workType === '전실/입상' || workType === '전실입상') return 'hole'
  if (workType === '나사') return 'nasa'
  return 'other'
}
const isTargetWorkType = (value) => resolveWorkTypeGroup(value) !== 'other'
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const formatKoreanDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일`
}
const formatHourMinute = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  if (h === 0 && m === 0) return '0분'
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}
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
const isDistributed = (row) =>
  Boolean(row?.drawing_date) || Boolean(row?.virtual_drawing_distributed)
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

export function useHomeScheduleCard({ session, selectedTuesday }) {
  const rows = ref([])
  const weldingHeadTimeSec = ref(80)
  const holeTimeSec = ref(80)
  const nasaHeadTimeSec = ref(80)
  let channel = null

  const fetchWorkTimeSetting = async () => {
    if (!session.value) return
    const { data } = await supabase
      .from('setting')
      .select('welding_head_time,hole_time,nasa_head_time')
      .limit(1)
      .maybeSingle()
    const weldingHead = toNumber(data?.welding_head_time)
    const hole = toNumber(data?.hole_time)
    const nasaHead = toNumber(data?.nasa_head_time)
    weldingHeadTimeSec.value = weldingHead > 0 ? weldingHead : 80
    holeTimeSec.value = hole > 0 ? hole : 80
    nasaHeadTimeSec.value = nasaHead > 0 ? nasaHead : 80
  }

  const fetchRows = async () => {
    if (!session.value) {
      rows.value = []
      return
    }
    const testDate = formatKoreanDate(new Date(selectedTuesday.value))
    const baseCols = 'work_type,hole,head,drawing_date,delay_time,complete,complete_date'
    const withVirtualCols = `${baseCols},virtual_drawing_distributed`
    const runQuery = (columns) => supabase.from(PRODUCT_LIST_TABLE).select(columns).eq('test_date', testDate)

    let { data, error } = await runQuery(withVirtualCols)
    if (error && String(error.message ?? '').includes('virtual_drawing_distributed')) {
      ;({ data, error } = await runQuery(baseCols))
    }
    if (error) {
      rows.value = []
      return
    }
    rows.value = data ?? []
  }

  const stopRealtime = () => {
    channel?.unsubscribe()
    channel = null
  }
  const setupRealtime = () => {
    stopRealtime()
    if (!session.value) return
    channel = supabase
      .channel('home-schedule-card-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: PRODUCT_LIST_TABLE }, async () => {
        await fetchRows()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'setting' }, async () => {
        await fetchWorkTimeSetting()
      })
      .subscribe()
  }

  watch(
    [session, selectedTuesday],
    async () => {
      await fetchWorkTimeSetting()
      await fetchRows()
      setupRealtime()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    stopRealtime()
  })

  const scheduleCard = computed(() => {
    const totalHeadSum = rows.value.reduce((sum, row) => sum + toNumber(row?.head), 0)
    const totalHoleSum = rows.value.reduce((sum, row) => sum + toNumber(row?.hole), 0)
    const distributedSourceRows = rows.value.filter(isDistributed)
    const distributedHeadSum = distributedSourceRows.reduce((sum, row) => sum + toNumber(row?.head), 0)
    const distributedHoleSum = distributedSourceRows.reduce((sum, row) => sum + toNumber(row?.hole), 0)
    const distributedRows = rows.value.filter((row) => isDistributed(row) && isTargetWorkType(row?.work_type))
    let totalQty = 0
    let completedQty = 0
    let weightedProcessSecSum = 0
    let pendingDelaySec = 0

    for (const row of distributedRows) {
      const qty = rowQty(row)
      if (qty <= 0) continue
      totalQty += qty
      weightedProcessSecSum +=
        qty *
        rowProcessSec(row, {
          weldingHeadTimeSec: weldingHeadTimeSec.value,
          holeTimeSec: holeTimeSec.value,
          nasaHeadTimeSec: nasaHeadTimeSec.value,
        })
      if (Boolean(row?.complete)) {
        completedQty += qty
      } else {
        pendingDelaySec += Math.max(0, toNumber(row?.delay_time))
      }
    }

    const remainingQty = Math.max(0, totalQty - completedQty)

    const tuesday = startOfDay(new Date(selectedTuesday.value))
    const monday = new Date(tuesday)
    monday.setDate(tuesday.getDate() - 1)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)
    const today = startOfDay(new Date())
    const isCurrentWeek = today >= monday && today <= friday
    const startDate = isCurrentWeek ? today : monday
    const workdaysForPlan = Math.max(1, countWeekdays(startDate, friday))

    const todayTargetQty = Math.ceil(remainingQty / workdaysForPlan)
    const avgProcessSec = totalQty > 0 ? weightedProcessSecSum / totalQty : weldingHeadTimeSec.value
    const requiredTodaySec = todayTargetQty * avgProcessSec + pendingDelaySec / workdaysForPlan
    const todayOvertimeSecRaw = Math.max(0, requiredTodaySec - REGULAR_WORK_SECONDS)
    const todayOvertimeSec = Math.min(todayOvertimeSecRaw, MAX_OVERTIME_SECONDS_WEEKDAY)

    return {
      todayTargetQty,
      todayOvertimeSec,
      branch: {
        title: '가지관',
        unit: '헤드',
        distributedQty: distributedHeadSum,
        totalQty: totalHeadSum,
        remainingQty: Math.max(0, totalHeadSum - distributedHeadSum),
      },
      main: {
        title: '메인관',
        unit: '홀',
        distributedQty: distributedHoleSum,
        totalQty: totalHoleSum,
        remainingQty: Math.max(0, totalHoleSum - distributedHoleSum),
      },
    }
  })

  return {
    scheduleCard,
  }
}

