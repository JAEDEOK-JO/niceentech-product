<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from '@/components/ui/button/Button.vue'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/lib/supabase'

const PRODUCT_LIST_TABLE = 'product_list'
const OVERTIME_TABLE = 'production_line_overtime_logs'
const DEFAULT_WELDING_HEAD_TIME_SEC = 80
const DEFAULT_HOLE_TIME_SEC = 80
const REGULAR_WORK_SEC = 8 * 3600
const MAX_WEEKDAY_OVERTIME_SEC = 3.5 * 3600
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const router = useRouter()
const { session } = useAuth()

const loading = ref(false)
const error = ref('')
const saveMessage = ref('')
const rows = ref([])
const overtimeLogs = ref([])
const selectedWeekStart = ref(getWorkWeekStartFromTestTuesday(new Date()))
const selectedInputWorkDate = ref('')
const lineFormState = ref({
  branch_head: { actualMin: '', delayReason: '' },
  main_hole: { actualMin: '', delayReason: '' },
})
const setting = ref({
  weldingHeadTimeSec: DEFAULT_WELDING_HEAD_TIME_SEC,
  holeTimeSec: DEFAULT_HOLE_TIME_SEC,
})

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getBaseTuesday(date) {
  const base = startOfDay(date)
  const daysUntilTuesday = ((2 - base.getDay() + 7) % 7) || 7
  base.setDate(base.getDate() + daysUntilTuesday)
  return base
}

function getWorkWeekStartFromTestTuesday(date) {
  return addDays(getBaseTuesday(date), -7)
}

function getMonday(date) {
  const base = startOfDay(date)
  const day = base.getDay()
  const diff = day === 0 ? -6 : 1 - day
  base.setDate(base.getDate() + diff)
  return base
}

function isSameDay(left, right) {
  return startOfDay(left).getTime() === startOfDay(right).getTime()
}

function formatMonthDay(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}.${day}`
}

function formatDayLabel(date) {
  return `${formatMonthDay(date)} (${WEEKDAY_LABELS[date.getDay()]})`
}

function formatWeekRange(startDate) {
  const endDate = addDays(startDate, 6)
  return `${formatMonthDay(startDate)} (${WEEKDAY_LABELS[startDate.getDay()]}) ~ ${formatMonthDay(endDate)} (${WEEKDAY_LABELS[endDate.getDay()]})`
}

function formatKoreanDate(date) {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일`
}

function formatQtyCell(value) {
  const safe = Math.max(0, toNumber(value))
  return safe > 0 ? safe.toLocaleString('ko-KR') : ''
}

function formatHourMinuteFromSeconds(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0))
  const hour = Math.floor(safe / 3600)
  const minute = Math.floor((safe % 3600) / 60)
  if (hour === 0 && minute === 0) return '0분'
  if (hour === 0) return `${minute}분`
  if (minute === 0) return `${hour}시간`
  return `${hour}시간 ${minute}분`
}

function parseIsoDate(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : startOfDay(date)
}

function parseMonthDayDate(value, referenceDate = selectedWeekStart.value) {
  const raw = String(value ?? '').trim()
  const yearMatched = raw.match(/^(\d{2})\.(\d{2})\.(\d{2})$/)
  if (yearMatched) {
    const [, year, month, day] = yearMatched
    const parsed = new Date(2000 + Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed)
  }
  const match = raw.match(/^(\d{2})\.(\d{2})$/)
  if (!match) return null
  const [, month, day] = match
  const parsed = new Date(referenceDate.getFullYear(), Number(month) - 1, Number(day))
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed)
}

function parseStoredNote(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return { delayReason: '' }
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw)
      return { delayReason: String(parsed?.delayReason ?? '').trim() }
    } catch {
      return { delayReason: raw }
    }
  }
  return { delayReason: raw }
}

function serializeStoredNote(delayReason) {
  return JSON.stringify({
    delayMin: 0,
    delayReason: String(delayReason ?? '').trim(),
  })
}

function getStageCompletedDate(row, lineType) {
  return lineType === 'branch_head'
    ? parseMonthDayDate(row?.worker_t_time)
    : parseMonthDayDate(row?.worker_main_time)
}

function isDistributedRow(row) {
  return Boolean(row?.drawing_date) || Boolean(row?.virtual_drawing_distributed)
}

function hasStageCompleted(row, lineType) {
  return Boolean(getStageCompletedDate(row, lineType))
}

function isDistributedOnDate(row, targetDate) {
  const drawingDate = parseIsoDate(row?.drawing_date)
  return drawingDate ? isSameDay(drawingDate, targetDate) : false
}

function isCompletedOnDate(row, lineType, targetDate) {
  const completedDate = getStageCompletedDate(row, lineType)
  return completedDate ? isSameDay(completedDate, targetDate) : false
}

function sumHead(targetRows) {
  return targetRows.reduce((sum, row) => sum + Math.max(0, toNumber(row?.head)), 0)
}

function sumHole(targetRows) {
  return targetRows.reduce((sum, row) => sum + Math.max(0, toNumber(row?.hole)), 0)
}

function isWeekdayWorkDate(date) {
  const day = date.getDay()
  return day >= 1 && day <= 5
}

function buildCalculatedPlanMap({ backlogQty, unitSec, dates, planningStartDate, isCurrentWeek }) {
  const map = {}
  let remainingSec = Math.max(0, backlogQty * unitSec)
  const candidateDates = dates.filter((date) => {
    if (!isCurrentWeek) return true
    return startOfDay(date).getTime() >= planningStartDate.getTime()
  })
  const weekdayDates = candidateDates.filter((date) => isWeekdayWorkDate(date))
  const weekendDates = candidateDates.filter((date) => !isWeekdayWorkDate(date))

  // Production week is Tue~Mon for a Tuesday inspection date.
  // Use all remaining weekdays first (Tue~Fri, Mon), then weekend only if still short.
  const planningOrder = [...weekdayDates, ...weekendDates]
  const planMap = new Map()

  for (const date of planningOrder) {
    const key = formatKoreanDate(date)
    const day = date.getDay()

    if (day >= 1 && day <= 5) {
      if (remainingSec <= 0) {
        planMap.set(key, '정시 작업 가능')
        continue
      }
      const todayWorkSec = Math.min(remainingSec, REGULAR_WORK_SEC + MAX_WEEKDAY_OVERTIME_SEC)
      const overtimeSec = Math.max(0, todayWorkSec - REGULAR_WORK_SEC)
      planMap.set(key, overtimeSec > 0 ? formatHourMinuteFromSeconds(overtimeSec) : '정시 작업 가능')
      remainingSec = Math.max(0, remainingSec - todayWorkSec)
      continue
    }

    if (remainingSec <= 0) {
      planMap.set(key, '작업 불필요')
      continue
    }

    const remainingWeekendDates = weekendDates.filter(
      (weekendDate) => startOfDay(weekendDate).getTime() >= startOfDay(date).getTime(),
    )
    const isLastWeekendDate = remainingWeekendDates.length <= 1
    const todayRequiredSec = isLastWeekendDate
      ? remainingSec
      : Math.min(remainingSec, REGULAR_WORK_SEC)
    planMap.set(
      key,
      todayRequiredSec <= REGULAR_WORK_SEC
        ? `작업필요(정시 ${formatHourMinuteFromSeconds(todayRequiredSec)})`
        : `정시 + ${formatHourMinuteFromSeconds(todayRequiredSec - REGULAR_WORK_SEC)}`,
    )
    remainingSec = Math.max(0, remainingSec - todayRequiredSec)
  }

  for (const date of dates) {
    const key = formatKoreanDate(date)
    if (isCurrentWeek && startOfDay(date).getTime() < planningStartDate.getTime()) {
      map[key] = ''
      continue
    }
    map[key] = planMap.get(key) ?? '작업 불필요'
  }

  return map
}

async function fetchSetting() {
  if (!session.value) return
  const { data } = await supabase
    .from('setting')
    .select('welding_head_time,hole_time')
    .limit(1)
    .maybeSingle()

  setting.value = {
    weldingHeadTimeSec: Math.max(1, toNumber(data?.welding_head_time) || DEFAULT_WELDING_HEAD_TIME_SEC),
    holeTimeSec: Math.max(1, toNumber(data?.hole_time) || DEFAULT_HOLE_TIME_SEC),
  }
}

const weekDates = computed(() =>
  Array.from({ length: 7 }, (_, index) => addDays(selectedWeekStart.value, index)),
)
const weekRangeText = computed(() => formatWeekRange(selectedWeekStart.value))
const weekTestDateText = computed(() => formatKoreanDate(addDays(selectedWeekStart.value, 7)))
const selectedDateOptions = computed(() =>
  weekDates.value.map((date) => ({
    value: formatKoreanDate(date),
    label: formatDayLabel(date),
  })),
)

async function fetchRows() {
  if (!session.value) {
    rows.value = []
    return
  }

  const baseColumns = 'id,head,hole,drawing_date,worker_t_time,worker_main_time'
  const withVirtualColumns = `${baseColumns},virtual_drawing_distributed`
  const runQuery = (columns) =>
    supabase
      .from(PRODUCT_LIST_TABLE)
      .select(columns)
      .eq('test_date', weekTestDateText.value)
      .order('drawing_date', { ascending: true })

  let { data, error: queryError } = await runQuery(withVirtualColumns)
  if (queryError && String(queryError.message ?? '').includes('virtual_drawing_distributed')) {
    ;({ data, error: queryError } = await runQuery(baseColumns))
  }

  if (queryError) {
    rows.value = []
    error.value = `통계 조회 실패: ${queryError.message}`
    return
  }

  rows.value = data ?? []
}

async function fetchOvertimeLogs() {
  if (!session.value) {
    overtimeLogs.value = []
    return
  }

  const workDateTexts = weekDates.value.map((date) => formatKoreanDate(date))
  const { data, error: queryError } = await supabase
    .from(OVERTIME_TABLE)
    .select('work_date,line_type,actual_overtime_min,note')
    .eq('test_date', weekTestDateText.value)
    .in('work_date', workDateTexts)

  if (queryError) {
    overtimeLogs.value = []
    error.value = `야근 로그 조회 실패: ${queryError.message}`
    return
  }

  overtimeLogs.value = data ?? []
}

async function fetchWeeklyStats() {
  if (!session.value) return
  loading.value = true
  error.value = ''
  saveMessage.value = ''
  await fetchSetting()
  await fetchRows()
  await fetchOvertimeLogs()
  loading.value = false
}

const dailyBranchRows = computed(() =>
  weekDates.value.map((date) => ({
    key: formatKoreanDate(date),
    dateLabel: formatDayLabel(date),
    distributedQty: sumHead(rows.value.filter((row) => isDistributedOnDate(row, date))),
    completedQty: sumHead(rows.value.filter((row) => isCompletedOnDate(row, 'branch_head', date))),
    isToday: isSameDay(date, new Date()),
  })),
)

const dailyMainRows = computed(() =>
  weekDates.value.map((date) => ({
    key: formatKoreanDate(date),
    dateLabel: formatDayLabel(date),
    distributedQty: sumHole(rows.value.filter((row) => isDistributedOnDate(row, date))),
    completedQty: sumHole(rows.value.filter((row) => isCompletedOnDate(row, 'main_hole', date))),
    isToday: isSameDay(date, new Date()),
  })),
)

const lineCards = computed(() => {
  const distributedRows = rows.value.filter(isDistributedRow)
  const branchDistributedQty = sumHead(distributedRows)
  const branchCompletedQty = sumHead(distributedRows.filter((row) => hasStageCompleted(row, 'branch_head')))
  const mainDistributedQty = sumHole(distributedRows)
  const mainCompletedQty = sumHole(distributedRows.filter((row) => hasStageCompleted(row, 'main_hole')))

  return [
    {
      key: 'branch_head',
      title: '가지관',
      accent: 'emerald',
      distributedQty: branchDistributedQty,
      completedQty: branchCompletedQty,
      remainingQty: Math.max(0, branchDistributedQty - branchCompletedQty),
      unitText: `${setting.value.weldingHeadTimeSec}초/개`,
    },
    {
      key: 'main_hole',
      title: '메인관',
      accent: 'cyan',
      distributedQty: mainDistributedQty,
      completedQty: mainCompletedQty,
      remainingQty: Math.max(0, mainDistributedQty - mainCompletedQty),
      unitText: `${setting.value.holeTimeSec}초/개`,
    },
  ]
})

const overtimeByDate = computed(() => {
  const map = {}
  for (const row of overtimeLogs.value) {
    const workDate = String(row?.work_date ?? '').trim()
    const lineType = String(row?.line_type ?? '').trim()
    if (!workDate || !lineType) continue
    if (!map[workDate]) {
      map[workDate] = {
        branch_head: { actualMin: null, delayTexts: [] },
        main_hole: { actualMin: null, delayTexts: [] },
      }
    }
    if (!map[workDate][lineType]) continue
    const parsed = parseStoredNote(row?.note)
    map[workDate][lineType].actualMin = Math.max(0, toNumber(row?.actual_overtime_min))
    if (parsed.delayReason) map[workDate][lineType].delayTexts.push(parsed.delayReason)
  }
  return map
})

const selectedLogEntries = computed(() => {
  const workDate = selectedInputWorkDate.value
  const base = {
    branch_head: { actualMin: '', delayReason: '' },
    main_hole: { actualMin: '', delayReason: '' },
  }
  if (!workDate) return base
  const entry = overtimeByDate.value[workDate]
  if (!entry) return base

  return {
    branch_head: {
      actualMin: entry.branch_head.actualMin > 0 ? String(entry.branch_head.actualMin) : '',
      delayReason: entry.branch_head.delayTexts.join(' / '),
    },
    main_hole: {
      actualMin: entry.main_hole.actualMin > 0 ? String(entry.main_hole.actualMin) : '',
      delayReason: entry.main_hole.delayTexts.join(' / '),
    },
  }
})

function formatActualText(actualMin) {
  if (actualMin === null) return ''
  if (actualMin === 0) return '야근없음'
  return formatHourMinuteFromSeconds(actualMin * 60)
}

const weekRows = computed(() => {
  const weekEnd = startOfDay(addDays(selectedWeekStart.value, 6))
  const todayDate = startOfDay(new Date())
  const isCurrentWeek =
    todayDate.getTime() >= startOfDay(selectedWeekStart.value).getTime() &&
    todayDate.getTime() <= weekEnd.getTime()
  const planningStartDate = isCurrentWeek ? todayDate : startOfDay(selectedWeekStart.value)
  const branchPlanMap = buildCalculatedPlanMap({
    backlogQty: lineCards.value.find((card) => card.key === 'branch_head')?.remainingQty ?? 0,
    unitSec: setting.value.weldingHeadTimeSec,
    dates: weekDates.value,
    planningStartDate,
    isCurrentWeek,
  })
  const mainPlanMap = buildCalculatedPlanMap({
    backlogQty: lineCards.value.find((card) => card.key === 'main_hole')?.remainingQty ?? 0,
    unitSec: setting.value.holeTimeSec,
    dates: weekDates.value,
    planningStartDate,
    isCurrentWeek,
  })

  return weekDates.value.map((date) => {
    const key = formatKoreanDate(date)
    const canShowActuals = !isCurrentWeek || startOfDay(date).getTime() <= todayDate.getTime()
    const overtimeEntry = overtimeByDate.value[key] ?? {
      branch_head: { actualMin: null, delayTexts: [] },
      main_hole: { actualMin: null, delayTexts: [] },
    }

    return {
      key,
      dateLabel: formatDayLabel(date),
      isToday: isSameDay(date, new Date()),
      branchDistributedQty: canShowActuals ? dailyBranchRows.value.find((row) => row.key === key)?.distributedQty ?? 0 : null,
      branchCompletedQty: canShowActuals ? dailyBranchRows.value.find((row) => row.key === key)?.completedQty ?? 0 : null,
      branchCalculatedText: branchPlanMap[key] ?? '',
      branchActualText: canShowActuals ? formatActualText(overtimeEntry.branch_head.actualMin) : '',
      mainDistributedQty: canShowActuals ? dailyMainRows.value.find((row) => row.key === key)?.distributedQty ?? 0 : null,
      mainCompletedQty: canShowActuals ? dailyMainRows.value.find((row) => row.key === key)?.completedQty ?? 0 : null,
      mainCalculatedText: mainPlanMap[key] ?? '',
      mainActualText: canShowActuals ? formatActualText(overtimeEntry.main_hole.actualMin) : '',
      delayReasonText: canShowActuals ? [...overtimeEntry.branch_head.delayTexts, ...overtimeEntry.main_hole.delayTexts].join(' / ') : '',
    }
  })
})

function cardBorderClass(accent) {
  return accent === 'emerald' ? 'border-emerald-200' : 'border-cyan-200'
}

function badgeClass(accent) {
  return accent === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'
}

function moveWeek(delta) {
  selectedWeekStart.value = addDays(selectedWeekStart.value, delta * 7)
}

function resetWeek() {
  selectedWeekStart.value = getWorkWeekStartFromTestTuesday(new Date())
}

function goHome() {
  router.push('/home')
}

function goMain() {
  router.push('/main')
}

function onWorkDateChange(event) {
  selectedInputWorkDate.value = String(event.target.value ?? '')
}

function onBranchActualInput(event) {
  lineFormState.value.branch_head.actualMin = String(event.target.value ?? '')
}

function onMainActualInput(event) {
  lineFormState.value.main_hole.actualMin = String(event.target.value ?? '')
}

function onBranchReasonInput(event) {
  lineFormState.value.branch_head.delayReason = String(event.target.value ?? '')
}

function onMainReasonInput(event) {
  lineFormState.value.main_hole.delayReason = String(event.target.value ?? '')
}

async function saveLine(lineType) {
  if (!session.value || !selectedInputWorkDate.value) return

  saveMessage.value = ''
  const actualMin = Math.max(0, Math.floor(toNumber(lineFormState.value[lineType].actualMin)))
  const note = serializeStoredNote(lineFormState.value[lineType].delayReason)

  const { error: upsertError } = await supabase.from(OVERTIME_TABLE).upsert(
    {
      test_date: weekTestDateText.value,
      work_date: selectedInputWorkDate.value,
      line_type: lineType,
      actual_overtime_min: actualMin,
      note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'test_date,work_date,line_type' },
  )

  if (upsertError) {
    saveMessage.value = `저장 실패: ${upsertError.message}`
    return
  }

  saveMessage.value = `${lineType === 'branch_head' ? '가지관' : '메인관'} 저장 완료`
  await fetchOvertimeLogs()
}

function saveBranchLine() {
  return saveLine('branch_head')
}

function saveMainLine() {
  return saveLine('main_hole')
}

watch(
  [session, selectedWeekStart],
  async () => {
    await fetchWeeklyStats()
  },
  { immediate: true },
)

watch(
  weekDates,
  (dates) => {
    const todayText = formatKoreanDate(new Date())
    const exists = dates.some((date) => formatKoreanDate(date) === selectedInputWorkDate.value)
    const preferred = dates.find((date) => formatKoreanDate(date) === todayText) ?? dates[0]
    if (!exists && preferred) {
      selectedInputWorkDate.value = formatKoreanDate(preferred)
    }
  },
  { immediate: true },
)

watch(
  selectedLogEntries,
  (entries) => {
    lineFormState.value = {
      branch_head: { ...entries.branch_head },
      main_hole: { ...entries.main_hole },
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class='min-h-screen bg-slate-100'>
    <header class='sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur'>
      <div class='mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6'>
        <div class='flex flex-col justify-between gap-3 md:flex-row md:items-start'>
          <div class='min-w-0'>
            <p class='text-xs font-bold uppercase tracking-[0.18em] text-slate-500'>Daily Work Stats</p>
            <h1 class='mt-1 text-xl font-extrabold text-slate-900 md:text-2xl'>주간 작업일지</h1>
          </div>
          <div class='flex shrink-0 items-center gap-2'>
            <Button class='h-9 px-3 text-sm' variant='outline' @click='goHome'>홈</Button>
            <Button class='h-9 px-3 text-sm' variant='outline' @click='goMain'>메인</Button>
          </div>
        </div>

        <div class='flex flex-wrap items-center gap-2'>
          <Button class='h-9 px-3 text-sm' variant='outline' @click='moveWeek(-1)'>지난주</Button>
          <Button class='h-9 px-3 text-sm' variant='outline' @click='resetWeek'>이번주</Button>
          <Button class='h-9 px-3 text-sm' variant='outline' @click='moveWeek(1)'>다음주</Button>
          <span class='rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700'>
            {{ weekRangeText }}
          </span>
        </div>
      </div>
    </header>

    <main class='mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-8'>
      <section class='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div class='flex flex-col gap-1'>
          <p class='text-sm font-bold text-slate-900'>야근 입력</p>
          <p class='text-sm text-slate-500'>선택한 날짜 기준으로 가지관과 메인관 실제야근, 지연사유를 저장합니다.</p>
        </div>

        <div class='mt-4 flex flex-wrap items-center gap-2'>
          <span class='text-xs font-semibold text-slate-600'>입력 날짜</span>
          <select
            class='h-9 min-w-[180px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700'
            :value='selectedInputWorkDate'
            @change='onWorkDateChange'
          >
            <option v-for='option in selectedDateOptions' :key='option.value' :value='option.value'>
              {{ option.label }}
            </option>
          </select>
          <span v-if='saveMessage' class='text-sm font-semibold text-emerald-700'>{{ saveMessage }}</span>
        </div>

        <div class='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2'>
          <div class='rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4'>
            <div class='flex flex-col gap-3 xl:flex-row xl:items-center'>
              <p class='w-16 shrink-0 text-sm font-bold text-emerald-800'>가지관</p>
              <span class='text-xs font-semibold text-slate-600'>실제야근(분)</span>
              <input
                :value='lineFormState.branch_head.actualMin'
                type='number'
                min='0'
                step='1'
                class='h-10 w-24 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700'
                @input='onBranchActualInput'
              />
              <input
                :value='lineFormState.branch_head.delayReason'
                type='text'
                placeholder='지연사유'
                class='h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 xl:min-w-[180px]'
                @input='onBranchReasonInput'
              />
              <Button class='h-10 px-3 text-sm xl:shrink-0' @click='saveBranchLine'>저장</Button>
            </div>
          </div>

          <div class='rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4'>
            <div class='flex flex-col gap-3 xl:flex-row xl:items-center'>
              <p class='w-16 shrink-0 text-sm font-bold text-cyan-800'>메인관</p>
              <span class='text-xs font-semibold text-slate-600'>실제야근(분)</span>
              <input
                :value='lineFormState.main_hole.actualMin'
                type='number'
                min='0'
                step='1'
                class='h-10 w-24 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700'
                @input='onMainActualInput'
              />
              <input
                :value='lineFormState.main_hole.delayReason'
                type='text'
                placeholder='지연사유'
                class='h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 xl:min-w-[180px]'
                @input='onMainReasonInput'
              />
              <Button class='h-10 px-3 text-sm xl:shrink-0' @click='saveMainLine'>저장</Button>
            </div>
          </div>
        </div>
      </section>

      <section class='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <article
          v-for='card in lineCards'
          :key='card.key'
          class='rounded-3xl border bg-white p-5 shadow-sm'
          :class='cardBorderClass(card.accent)'
        >
          <div class='flex items-start justify-between gap-3'>
            <div>
              <p class='text-lg font-extrabold text-slate-900'>{{ card.title }}</p>
              <p class='mt-1 text-sm text-slate-500'>{{ weekTestDateText }} 검수분 기준</p>
            </div>
            <span class='rounded-full px-2.5 py-1 text-xs font-bold' :class='badgeClass(card.accent)'>
              {{ card.unitText }}
            </span>
          </div>

          <div class='mt-4 grid grid-cols-3 gap-3'>
            <div class='rounded-2xl bg-slate-50 p-4'>
              <p class='text-xs font-semibold text-slate-500'>검수분 배포</p>
              <p class='mt-1 text-2xl font-extrabold text-slate-900'>{{ card.distributedQty.toLocaleString('ko-KR') }}</p>
            </div>
            <div class='rounded-2xl bg-slate-50 p-4'>
              <p class='text-xs font-semibold text-slate-500'>검수분 완료</p>
              <p class='mt-1 text-2xl font-extrabold text-slate-900'>{{ card.completedQty.toLocaleString('ko-KR') }}</p>
            </div>
            <div class='rounded-2xl bg-slate-50 p-4'>
              <p class='text-xs font-semibold text-slate-500'>검수분 남은</p>
              <p class='mt-1 text-2xl font-extrabold text-slate-900'>{{ card.remainingQty.toLocaleString('ko-KR') }}</p>
            </div>
          </div>
        </article>
      </section>

      <section class='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div class='flex flex-col gap-1'>
          <p class='text-sm font-bold text-slate-900'>주간 야근표</p>
        </div>

        <div v-if='loading' class='mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500'>
          주간 데이터를 불러오는 중...
        </div>
        <div v-else-if='error' class='mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700'>
          {{ error }}
        </div>
        <div v-else class='mt-4 space-y-4'>
          <div class='grid grid-cols-1 xl:grid-cols-2' style='gap: 5px;'>
            <div class='overflow-x-auto'>
              <table class='min-w-full w-full border-collapse'>
                <thead class='bg-emerald-50'>
                  <tr>
                    <th class='border border-emerald-200 px-3 py-2 text-center text-xs font-bold text-emerald-800'>날짜</th>
                    <th class='border border-emerald-200 px-3 py-2 text-center text-xs font-bold text-emerald-800'>배포헤드</th>
                    <th class='border border-emerald-200 px-3 py-2 text-center text-xs font-bold text-emerald-800'>완료헤드</th>
                    <th class='border border-emerald-200 px-3 py-2 text-center text-xs font-bold text-emerald-800'>계산야근</th>
                    <th class='border border-emerald-200 px-3 py-2 text-center text-xs font-bold text-emerald-800'>실제야근</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for='row in weekRows' :key='`${row.key}-branch`' :class='row.isToday ? "bg-orange-50" : "bg-white"'>
                    <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-900'>{{ row.dateLabel }}</td>
                    <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-900'>{{ formatQtyCell(row.branchDistributedQty) }}</td>
                    <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-900'>{{ formatQtyCell(row.branchCompletedQty) }}</td>
                    <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-emerald-700'>{{ row.branchCalculatedText }}</td>
                    <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-emerald-700'>{{ row.branchActualText }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class='overflow-x-auto'>
              <table class='min-w-full w-full border-collapse'>
                <thead class='bg-cyan-50'>
                  <tr>
                    <th class='border border-cyan-200 px-3 py-2 text-center text-xs font-bold text-cyan-800'>날짜</th>
                    <th class='border border-cyan-200 px-3 py-2 text-center text-xs font-bold text-cyan-800'>배포홀</th>
                    <th class='border border-cyan-200 px-3 py-2 text-center text-xs font-bold text-cyan-800'>완료홀</th>
                    <th class='border border-cyan-200 px-3 py-2 text-center text-xs font-bold text-cyan-800'>계산야근</th>
                    <th class='border border-cyan-200 px-3 py-2 text-center text-xs font-bold text-cyan-800'>실제야근</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for='row in weekRows' :key='`${row.key}-main`' :class='row.isToday ? "bg-orange-50" : "bg-white"'>
                    <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-900'>{{ row.dateLabel }}</td>
                    <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-900'>{{ formatQtyCell(row.mainDistributedQty) }}</td>
                    <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-900'>{{ formatQtyCell(row.mainCompletedQty) }}</td>
                    <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-cyan-700'>{{ row.mainCalculatedText }}</td>
                    <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-cyan-700'>{{ row.mainActualText }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class='overflow-x-auto'>
            <table class='min-w-full w-full border-collapse'>
              <thead class='bg-slate-100'>
                <tr>
                  <th class='border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700'>날짜</th>
                  <th class='border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700'>지연사유</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for='row in weekRows' :key='`${row.key}-delay`' :class='row.isToday ? "bg-orange-50" : "bg-white"'>
                  <td class='border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-900'>{{ row.dateLabel }}</td>
                  <td class='border border-slate-200 px-3 py-3 text-center text-sm text-slate-700'>{{ row.delayReasonText }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </section>
</template>

