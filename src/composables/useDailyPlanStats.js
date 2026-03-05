import { computed, onUnmounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const stageMeta = [
  { key: 'marking_weld_a_status', label: '마킹1' },
  { key: 'marking_weld_b_status', label: '마킹2' },
  { key: 'marking_laser_1_status', label: '레이저1' },
  { key: 'marking_laser_2_status', label: '레이저2' },
  { key: 'beveling_status', label: '티&면치' },
  { key: 'main_status', label: '메인' },
  { key: 'nasa_status', label: '무용접' },
]

const normalizeText = (value) => String(value ?? '').replaceAll(' ', '').trim()
const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
const formatKoreanDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일`
}
const formatDateKey = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const parseDateKey = (value) => {
  const raw = String(value ?? '').trim()
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [, y, mo, d] = m
  const next = new Date(Number(y), Number(mo) - 1, Number(d))
  return Number.isNaN(next.getTime()) ? null : next
}
const isHoleBased = (row) => {
  const t = normalizeText(row?.work_type)
  return t.includes('전실/입상') || t.includes('전실입상')
}
const rowQty = (row) => (isHoleBased(row) ? toNumber(row?.hole) : toNumber(row?.head))
const isDistributedRow = (row) =>
  String(row?.drawing_date ?? '').trim().length > 0 || Boolean(row?.virtual_drawing_distributed)
const isDoneStatus = (value) => {
  const t = String(value ?? '').trim()
  if (t.includes('작업중')) return false
  return !t || t === '없음' || t.includes('작업완료')
}
const isInProgressStatus = (value) => String(value ?? '').trim().includes('작업중')
const toWeekdayKorean = (date) => {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return days[date.getDay()]
}

export function useDailyPlanStats(session) {
  const loading = ref(false)
  const error = ref('')
  const selectedDate = ref(new Date())
  const snapshot = ref(null)
  const stageRows = ref([])
  let statsChannel = null

  const fetchRows = async () => {
    if (!session.value) {
      snapshot.value = null
      stageRows.value = []
      return
    }

    loading.value = true
    error.value = ''

    const snapshotDate = formatDateKey(selectedDate.value)
    const testDate = formatKoreanDate(selectedDate.value)
    const snapshotQuery = supabase
      .from('daily_plan_snapshots')
      .select(
        'id,snapshot_date,test_date,weekday,daily_target_head,completed_head,total_head,remaining_head,today_overtime_sec,weekly_overtime_sec,distributed_drawing_count,total_drawing_count,created_at',
      )
      .eq('snapshot_date', snapshotDate)
      .maybeSingle()

    const stageQuery = supabase
      .from('product_list')
      .select(
        'work_type,hole,head,drawing_date,virtual_drawing_distributed,marking_weld_a_status,marking_weld_b_status,marking_laser_1_status,marking_laser_2_status,beveling_status,main_status,nasa_status',
      )
      .eq('test_date', testDate)

    const [{ data: snapshotData, error: snapshotError }, { data: stageData, error: stageError }] =
      await Promise.all([snapshotQuery, stageQuery])

    loading.value = false
    if (snapshotError || stageError) {
      snapshot.value = null
      stageRows.value = []
      error.value = `통계 조회 실패: ${snapshotError?.message || stageError?.message}`
      return
    }

    snapshot.value = snapshotData
    stageRows.value = stageData ?? []
  }

  watch(
    [session, selectedDate],
    async () => {
      await fetchRows()
    },
    { immediate: true },
  )

  const formatHourMinute = (seconds) => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0))
    const h = Math.floor(safe / 3600)
    const m = Math.floor((safe % 3600) / 60)
    if (h === 0 && m === 0) return '0분'
    if (m === 0) return `${h}시간`
    return `${h}시간 ${m}분`
  }

  const summary = computed(() => {
    const row = snapshot.value
    const dailyTargetHead = Number(row?.daily_target_head ?? 0) || 0
    const completedHead = Number(row?.completed_head ?? 0) || 0
    const totalHead = Number(row?.total_head ?? 0) || 0
    const remainingHead = Number(row?.remaining_head ?? 0) || 0
    const todayOvertimeSec = Number(row?.today_overtime_sec ?? 0) || 0
    const weeklyOvertimeSec = Number(row?.weekly_overtime_sec ?? 0) || 0
    return {
      dailyTargetHead,
      completedHead,
      totalHead,
      remainingHead,
      todayOvertimeSec,
      weeklyOvertimeSec,
      distributedDrawingCount: Number(row?.distributed_drawing_count ?? 0) || 0,
      totalDrawingCount: Number(row?.total_drawing_count ?? 0) || 0,
      todayOvertimeText: formatHourMinute(todayOvertimeSec),
      weeklyOvertimeText: formatHourMinute(weeklyOvertimeSec),
    }
  })

  const stageStats = computed(() =>
    stageMeta.map((stage) => {
      let inProgressQty = 0
      let doneQty = 0
      let totalQty = 0
      for (const row of stageRows.value) {
        if (!isDistributedRow(row)) continue
        const qty = rowQty(row)
        totalQty += qty
        const status = String(row?.[stage.key] ?? '').trim()
        if (isInProgressStatus(status)) inProgressQty += qty
        if (isDoneStatus(status)) doneQty += qty
      }
      const waitingQty = Math.max(0, totalQty - inProgressQty - doneQty)
      const completionRate = totalQty > 0 ? Math.round((doneQty / totalQty) * 100) : 0
      return {
        key: stage.key,
        label: stage.label,
        totalQty,
        inProgressQty,
        doneQty,
        waitingQty,
        completionRate,
      }
    }),
  )

  const selectedDateText = computed(() => formatKoreanDate(selectedDate.value))
  const selectedWeekday = computed(() => toWeekdayKorean(selectedDate.value))
  const selectedDateKey = computed({
    get: () => formatDateKey(selectedDate.value),
    set: (value) => {
      const parsed = parseDateKey(value)
      if (!parsed) return
      selectedDate.value = parsed
    },
  })
  const moveDay = (delta) => {
    const next = new Date(selectedDate.value)
    next.setDate(next.getDate() + delta)
    selectedDate.value = next
  }
  const resetToday = () => {
    selectedDate.value = new Date()
  }

  const stopRealtime = () => {
    statsChannel?.unsubscribe()
    statsChannel = null
  }
  const setupRealtime = () => {
    stopRealtime()
    if (!session.value) return
    statsChannel = supabase
      .channel('daily-plan-stats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_list' }, async () => {
        await fetchRows()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_plan_snapshots' }, async () => {
        await fetchRows()
      })
      .subscribe()
  }

  watch(
    session,
    () => {
      setupRealtime()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    stopRealtime()
  })

  return {
    loading,
    error,
    selectedDateText,
    selectedWeekday,
    selectedDateKey,
    summary,
    stageStats,
    formatHourMinute,
    refresh: fetchRows,
    moveDay,
    resetToday,
  }
}
