<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/button/Button.vue'
import ReportPrintSettingsDialog from './ReportPrintSettingsDialog.vue'
import { printManagementReport } from './reportPrint'
import { DEFAULT_WELDING_REPORT_MANAGERS, WELDING_INSPECTORS } from '@/utils/productionStatus'

const COMPANY_LIST_TABLE = 'company_list'
const METRIC_DEFINITIONS_TABLE = 'department_metric_definitions'
const METRIC_ENTRIES_TABLE = 'department_metric_entries'
const DEPARTMENT_CODE = 'operations'
const INVENTORY_PERIOD_TYPE = 'weekly'
const LEGACY_INVENTORY_PERIOD_TYPE = 'monthly'
const METRIC_KEYS = {
  received: 'monthly_received_ton',
  used: 'monthly_used_ton',
  balance: 'monthly_balance_ton',
}
const MANAGERS = DEFAULT_WELDING_REPORT_MANAGERS

const emit = defineEmits(['go-back'])
const props = defineProps({
  showBackButton: { type: Boolean, default: true },
})

const now = new Date()
const reportYear = now.getFullYear()
const reportMonth = now.getMonth() + 1
const reportMonthLabel = `${reportMonth}월`
const reportMonthValue = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`
const reportMonthEndValue = `${reportYear}-${String(reportMonth).padStart(2, '0')}-${String(new Date(reportYear, reportMonth, 0).getDate()).padStart(2, '0')}`

const MONTH_COUNT = 3
const last3Months = Array.from({ length: MONTH_COUNT }, (_, i) => {
  const d = new Date(reportYear, reportMonth - 1 - (MONTH_COUNT - 1 - i), 1)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const lastDay = new Date(y, m, 0).getDate()
  return {
    label: `${m}월`,
    key: `${y}-${String(m).padStart(2, '0')}`,
    start: `${y}-${String(m).padStart(2, '0')}-01T00:00:00`,
    end: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`,
  }
})
const weldingFetchStart = last3Months[0].start
const weldingFetchEnd = last3Months[last3Months.length - 1].end
const weldingIssuePeriodKeys = last3Months.map((m) => m.key)

const currentPage = ref(1)
const loading = ref(false)
const errorMessage = ref('')
const isPrinting = ref(false)
const isPrintSettingsOpen = ref(false)
const isInventoryDialogOpen = ref(false)
const selectedInventoryMonth = ref(new Date(reportYear, reportMonth - 1, 1))
const inventoryError = ref('')
const savingInventory = ref(false)
const totalBalanceSum = ref(0)
const weldingInspections = ref([])
const weldingIssues = ref([])
const isWeldingIssueDialogOpen = ref(false)
const savingWeldingIssue = ref(false)
const deletingWeldingIssueId = ref(null)
const weldingIssueForm = ref({ inspector: MANAGERS[0], issue_type: 'misproduction', company: '', place: '', area: '', memo: '', head_count: '' })
const weldingIssueError = ref('')
const weldingIssueCompanySearchText = ref('')
const weldingIssueCompanySearchLoading = ref(false)
const weldingIssueCompanySearchResults = ref([])
const createWeldingMetricState = (managers, detail = false) =>
  managers.reduce((acc, manager) => {
    acc[manager] = detail
      ? {
          inProgressHead: 0,
          completedHead: 0,
          misproductionCount: 0,
          shortageCount: 0,
          inspectionRows: [],
          issueRows: [],
        }
      : { completedHead: 0, misproductionCount: 0, shortageCount: 0 }
    return acc
  }, {})

const reportPeriodMonth = `${reportYear}-${String(reportMonth).padStart(2, '0')}`

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
const normalizeText = (value) => String(value ?? '').trim()
const formatTon = (value) => `${Number(value || 0).toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}톤`
const formatCount = (value) => Number(value || 0).toLocaleString('ko-KR')
const formatHeadCount = (value) => `${formatCount(value)}개`
const sanitizeDecimalInput = (value) => {
  const sanitized = String(value ?? '').replace(/[^\d.]/g, '')
  const [integerPart = '', ...decimalParts] = sanitized.split('.')
  return decimalParts.length ? `${integerPart}.${decimalParts.join('').slice(0, 1)}` : integerPart
}
const sanitizeCountInput = (value) => String(value ?? '').replace(/[^\d]/g, '')
const formatDateInput = (date) =>
  `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const formatMonthValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
const formatMonthEndValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
const formatMonthTitle = (date) => `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월`
const formatWeekRangeLabel = (startDate, endDate) => {
  const [, startMonth, startDay] = String(startDate ?? '').split('-')
  const [, endMonth, endDay] = String(endDate ?? '').split('-')
  if (!startMonth || !startDay || !endMonth || !endDay) return ''
  return `${Number(startMonth)}.${Number(startDay)} ~ ${Number(endMonth)}.${Number(endDay)}`
}
const getInventoryWeeks = (date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const weeks = []

  for (let startDay = 1, index = 0; startDay <= lastDay; startDay += 7, index += 1) {
    const endDay = Math.min(startDay + 6, lastDay)
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    weeks.push({
      label: `${index + 1}주차`,
      startDate,
      endDate,
      rangeLabel: formatWeekRangeLabel(startDate, endDate),
    })
  }

  return weeks
}
const formatShortDate = (value) => {
  const raw = normalizeText(value)
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return raw || '-'
  return `${matched[2]}월 ${matched[3]}일`
}
const formatTestDateShort = (value) => {
  const raw = normalizeText(value)
  if (!raw) return ''
  const korean = raw.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/)
  if (korean) {
    const [, y, m, d] = korean
    return `${String(y).slice(2)}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`
  }
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    const [, y, m, d] = iso
    return `${String(y).slice(2)}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`
  }
  const dot = raw.match(/^(\d{2,4})\.(\d{1,2})\.(\d{1,2})/)
  if (dot) {
    const [, y, m, d] = dot
    const yy = String(y).length === 4 ? String(y).slice(2) : String(y).padStart(2, '0')
    return `${yy}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`
  }
  return raw
}

const operationsMetricDefinitions = [
  { metric_key: METRIC_KEYS.received, label: '주간 입고', value_type: 'number', unit: '톤', sort_order: 1, is_active: true },
  { metric_key: METRIC_KEYS.used, label: '주간 사용', value_type: 'number', unit: '톤', sort_order: 2, is_active: true },
  { metric_key: METRIC_KEYS.balance, label: '주간 잔고', value_type: 'number', unit: '톤', sort_order: 3, is_active: true },
]

const createDefaultInventoryForm = () => ({
  received: '0',
  used: '0',
  balance: '0',
})
const createInventoryWeekForm = (week) => ({
  weekStartDate: week.startDate,
  weekEndDate: week.endDate,
  weekLabel: week.label,
  weekRangeLabel: week.rangeLabel,
  received: '0',
  used: '0',
  balance: '0',
})

const inventoryForm = ref(createDefaultInventoryForm())
const inventoryDraftWeeks = ref([])

const selectedInventoryMonthValue = computed(() => formatMonthValue(selectedInventoryMonth.value))
const selectedInventoryMonthEndValue = computed(() => formatMonthEndValue(selectedInventoryMonth.value))
const selectedInventoryMonthLabel = computed(() => formatMonthTitle(selectedInventoryMonth.value))
const isCurrentInventoryMonth = computed(() => selectedInventoryMonthValue.value === reportMonthValue)
const selectedInventoryWeeks = computed(() => getInventoryWeeks(selectedInventoryMonth.value))

const ensureOperationsMetricDefinitions = async () => {
  const { error } = await supabase.from(METRIC_DEFINITIONS_TABLE).upsert(
    operationsMetricDefinitions.map((item) => ({
      department_code: DEPARTMENT_CODE,
      ...item,
    })),
    { onConflict: 'department_code,metric_key' },
  )

  if (error) throw new Error(error.message ?? '공무부 지표 정의 저장에 실패했습니다.')
}

const fetchWeeklyInventoryEntriesByMonth = async (monthValue, monthEndValue) => {
  const { data, error } = await supabase
    .from(METRIC_ENTRIES_TABLE)
    .select('metric_key,numeric_value,period_start_date,period_end_date')
    .eq('department_code', DEPARTMENT_CODE)
    .eq('period_type', INVENTORY_PERIOD_TYPE)
    .gte('period_start_date', monthValue)
    .lte('period_start_date', monthEndValue)
    .in('metric_key', [METRIC_KEYS.received, METRIC_KEYS.used, METRIC_KEYS.balance])

  if (error) throw new Error(error.message ?? '공무부 수치 데이터를 불러오지 못했습니다.')
  return data ?? []
}

const fetchLegacyInventoryEntriesByMonth = async (monthValue) => {
  const { data, error } = await supabase
    .from(METRIC_ENTRIES_TABLE)
    .select('metric_key,numeric_value')
    .eq('department_code', DEPARTMENT_CODE)
    .eq('period_type', LEGACY_INVENTORY_PERIOD_TYPE)
    .eq('period_start_date', monthValue)
    .in('metric_key', [METRIC_KEYS.received, METRIC_KEYS.used, METRIC_KEYS.balance])

  if (error) throw new Error(error.message ?? '공무부 수치 데이터를 불러오지 못했습니다.')
  return data ?? []
}

const fetchWeldingInspections = async () => {
  const { data, error } = await supabase
    .from('welding_inspections')
    .select('id,inspector,welding_status,head_count,drawing_no,company,place,area,test_date,created_at')
    .gte('created_at', weldingFetchStart)
    .lte('created_at', weldingFetchEnd)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message ?? '용접 검수 데이터를 불러오지 못했습니다.')
  return data ?? []
}

const fetchWeldingIssues = async () => {
  const { data, error } = await supabase
    .from('welding_issues')
    .select('*')
    .in('period_month', weldingIssuePeriodKeys)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message ?? '오제작/누락분 데이터를 불러오지 못했습니다.')
  return data ?? []
}

const searchWeldingIssueCompanies = async () => {
  const term = normalizeText(weldingIssueCompanySearchText.value)
  if (!term) {
    weldingIssueCompanySearchResults.value = []
    return
  }
  weldingIssueCompanySearchLoading.value = true
  const { data, error } = await supabase
    .from(COMPANY_LIST_TABLE)
    .select('id,company,place,full_name')
    .ilike('full_name', `%${term}%`)
    .order('full_name', { ascending: true })
    .limit(20)
  weldingIssueCompanySearchLoading.value = false
  if (error) {
    weldingIssueError.value = error.message ?? '회사 검색에 실패했습니다.'
    return
  }
  weldingIssueCompanySearchResults.value = (data ?? []).map((item) => ({
    id: item.id,
    company: normalizeText(item.company),
    place: normalizeText(item.place),
    fullName: normalizeText(item.full_name),
  }))
}

const selectWeldingIssueCompany = (item) => {
  weldingIssueForm.value.company = item.company
  weldingIssueForm.value.place = item.place
  weldingIssueCompanySearchText.value = item.fullName || `${item.company} ${item.place}`.trim()
  weldingIssueCompanySearchResults.value = []
}

const saveWeldingIssue = async () => {
  weldingIssueError.value = ''
  savingWeldingIssue.value = true
  const { error } = await supabase.from('welding_issues').insert({
    inspector: weldingIssueForm.value.inspector,
    issue_type: weldingIssueForm.value.issue_type,
    company: String(weldingIssueForm.value.company ?? '').trim(),
    place: String(weldingIssueForm.value.place ?? '').trim(),
    area: String(weldingIssueForm.value.area ?? '').trim(),
    memo: String(weldingIssueForm.value.memo ?? '').trim(),
    head_count: toNumber(weldingIssueForm.value.head_count),
    period_month: reportPeriodMonth,
  })
  savingWeldingIssue.value = false
  if (error) {
    weldingIssueError.value = error.message ?? '저장 실패'
    return
  }
  weldingIssueForm.value = { inspector: MANAGERS[0], issue_type: 'misproduction', company: '', place: '', area: '', memo: '', head_count: '' }
  weldingIssueCompanySearchText.value = ''
  weldingIssueCompanySearchResults.value = []
  isWeldingIssueDialogOpen.value = false
  weldingIssues.value = await fetchWeldingIssues()
}

const deleteWeldingIssue = async (id) => {
  deletingWeldingIssueId.value = id
  await supabase.from('welding_issues').delete().eq('id', id)
  deletingWeldingIssueId.value = null
  weldingIssues.value = weldingIssues.value.filter((r) => r.id !== id)
}

const fetchAllBalanceEntries = async () => {
  const { data, error } = await supabase
    .from(METRIC_ENTRIES_TABLE)
    .select('numeric_value')
    .eq('department_code', DEPARTMENT_CODE)
    .eq('metric_key', METRIC_KEYS.balance)
    .in('period_type', [INVENTORY_PERIOD_TYPE, LEGACY_INVENTORY_PERIOD_TYPE])

  if (error) throw new Error(error.message ?? '공무부 잔고 데이터를 불러오지 못했습니다.')
  return data ?? []
}

const sumInventoryRows = (rows) =>
  rows.reduce(
    (accumulator, row) => {
      const metricKey = normalizeText(row?.metric_key)
      if (metricKey === METRIC_KEYS.received) accumulator.received += toNumber(row?.numeric_value)
      if (metricKey === METRIC_KEYS.used) accumulator.used += toNumber(row?.numeric_value)
      if (metricKey === METRIC_KEYS.balance) accumulator.balance += toNumber(row?.numeric_value)
      return accumulator
    },
    { received: 0, used: 0, balance: 0 },
  )

const buildInventoryDraftWeeks = ({ monthDate, weeklyRows, legacyRows }) => {
  const weeks = getInventoryWeeks(monthDate)
  const weeklyEntryMap = new Map(
    weeklyRows.map((row) => [`${normalizeText(row?.period_start_date)}:${normalizeText(row?.metric_key)}`, row]),
  )
  const legacyEntryMap = Object.fromEntries(legacyRows.map((row) => [normalizeText(row?.metric_key), row]))
  const hasWeeklyRows = weeklyRows.length > 0

  return weeks.map((week, index) => {
    const form = createInventoryWeekForm(week)

    if (hasWeeklyRows) {
      form.received = String(toNumber(weeklyEntryMap.get(`${week.startDate}:${METRIC_KEYS.received}`)?.numeric_value))
      form.used = String(toNumber(weeklyEntryMap.get(`${week.startDate}:${METRIC_KEYS.used}`)?.numeric_value))
      form.balance = String(toNumber(weeklyEntryMap.get(`${week.startDate}:${METRIC_KEYS.balance}`)?.numeric_value))
      return form
    }

    if (index === 0 && legacyRows.length > 0) {
      form.received = String(toNumber(legacyEntryMap[METRIC_KEYS.received]?.numeric_value))
      form.used = String(toNumber(legacyEntryMap[METRIC_KEYS.used]?.numeric_value))
      form.balance = String(toNumber(legacyEntryMap[METRIC_KEYS.balance]?.numeric_value))
    }

    return form
  })
}

const sumInventoryDraftWeeks = (rows) =>
  rows.reduce(
    (accumulator, row) => ({
      received: accumulator.received + toNumber(row?.received),
      used: accumulator.used + toNumber(row?.used),
      balance: accumulator.balance + toNumber(row?.balance),
    }),
    { received: 0, used: 0, balance: 0 },
  )

const fetchReportData = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const [weeklyInventoryRows, legacyInventoryRows, balanceRows, weldingRows, issueRows] = await Promise.all([
      fetchWeeklyInventoryEntriesByMonth(reportMonthValue, reportMonthEndValue),
      fetchLegacyInventoryEntriesByMonth(reportMonthValue),
      fetchAllBalanceEntries(),
      fetchWeldingInspections(),
      fetchWeldingIssues(),
    ])
    weldingInspections.value = weldingRows
    weldingIssues.value = issueRows
    totalBalanceSum.value = balanceRows.reduce((sum, row) => sum + toNumber(row?.numeric_value), 0)
    const inventoryTotals = weeklyInventoryRows.length > 0 ? sumInventoryRows(weeklyInventoryRows) : sumInventoryRows(legacyInventoryRows)

    inventoryForm.value = {
      received: String(inventoryTotals.received),
      used: String(inventoryTotals.used),
      balance: String(inventoryTotals.balance),
    }
  } catch (error) {
    errorMessage.value = error?.message ?? '공무부 데이터를 불러오지 못했습니다.'
    inventoryForm.value = createDefaultInventoryForm()
    inventoryDraftWeeks.value = []
    totalBalanceSum.value = 0
    weldingInspections.value = []
    weldingIssues.value = []
  } finally {
    loading.value = false
  }
}

const inventoryValues = computed(() => ({
  received: toNumber(inventoryForm.value.received),
  used: toNumber(inventoryForm.value.used),
  balance: toNumber(inventoryForm.value.balance),
}))

const summaryCards = computed(() => [
  {
    label: `${reportMonthLabel} 입고`,
    value: formatTon(inventoryValues.value.received),
    note: '당월 누적 입고량',
    tone: 'bg-sky-50 border-sky-200 text-sky-800',
  },
  {
    label: `${reportMonthLabel} 사용`,
    value: formatTon(inventoryValues.value.used),
    note: '당월 누적 사용량',
    tone: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  },
  {
    label: '총 잔고',
    value: formatTon(totalBalanceSum.value),
    note: '전체 입력 월 잔고 합산',
    tone: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  },
])

const weldingComparisonManagers = computed(() => {
  const names = new Set(MANAGERS)
  for (const row of weldingInspections.value) {
    const inspector = normalizeText(row?.inspector)
    if (inspector && !MANAGERS.includes(inspector)) names.add(inspector)
  }
  for (const row of weldingIssues.value) {
    const inspector = normalizeText(row?.inspector)
    if (inspector && !MANAGERS.includes(inspector)) names.add(inspector)
  }
  return [...names]
})
const weldingIssueManagerOptions = computed(() => {
  const names = new Set([...WELDING_INSPECTORS, ...weldingComparisonManagers.value])
  return [...names]
})
const weldingComparisonTitle = computed(() => `${weldingComparisonManagers.value.join(' / ')} 비교`)
const weldingStatusTitle = computed(() => `${weldingComparisonManagers.value.join(' / ')} 작업 현황`)

const weldingMetrics = computed(() => {
  const state = createWeldingMetricState(weldingComparisonManagers.value, true)

  for (const row of weldingInspections.value) {
    const monthKey = String(row.created_at ?? '').slice(0, 7)
    if (monthKey !== reportPeriodMonth) continue
    const inspectorName = normalizeText(row.inspector)
    const inspector = weldingComparisonManagers.value.includes(inspectorName) ? inspectorName : null
    if (!inspector) continue
    if (row.welding_status === '작업중') state[inspector].inProgressHead += toNumber(row.head_count)
    if (row.welding_status === '작업완료') state[inspector].completedHead += toNumber(row.head_count)
    state[inspector].inspectionRows.push(row)
  }

  for (const row of weldingIssues.value) {
    if (row.period_month !== reportPeriodMonth) continue
    const inspectorName = normalizeText(row.inspector)
    const inspector = weldingComparisonManagers.value.includes(inspectorName) ? inspectorName : null
    if (!inspector) continue
    if (row.issue_type === 'misproduction') state[inspector].misproductionCount += 1
    if (row.issue_type === 'shortage') state[inspector].shortageCount += 1
    state[inspector].issueRows.push(row)
  }

  return state
})

const monthlyWeldingMetrics = computed(() =>
  last3Months.map((month) => {
    const state = createWeldingMetricState(weldingComparisonManagers.value)

    for (const row of weldingInspections.value) {
      const monthKey = String(row.created_at ?? '').slice(0, 7)
      if (monthKey !== month.key) continue
      const inspectorName = normalizeText(row.inspector)
      const inspector = weldingComparisonManagers.value.includes(inspectorName) ? inspectorName : null
      if (!inspector) continue
      if (row.welding_status === '작업완료') state[inspector].completedHead += toNumber(row.head_count)
    }

    for (const row of weldingIssues.value) {
      if (row.period_month !== month.key) continue
      const inspectorName = normalizeText(row.inspector)
      const inspector = weldingComparisonManagers.value.includes(inspectorName) ? inspectorName : null
      if (!inspector) continue
      if (row.issue_type === 'misproduction') state[inspector].misproductionCount += 1
      if (row.issue_type === 'shortage') state[inspector].shortageCount += 1
    }

    return { ...month, metrics: state }
  }),
)

const upsertMetricEntry = async ({
  metricKey,
  numericValue = null,
  textValue = '',
  createdBy = null,
  periodStartDate = reportMonthValue,
  periodEndDate = reportMonthEndValue,
  periodType = INVENTORY_PERIOD_TYPE,
}) => {
  const { error } = await supabase.from(METRIC_ENTRIES_TABLE).upsert(
    {
      department_code: DEPARTMENT_CODE,
      metric_key: metricKey,
      period_type: periodType,
      period_start_date: periodStartDate,
      period_end_date: periodEndDate,
      numeric_value: numericValue,
      text_value: textValue,
      note: null,
      created_by: createdBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'department_code,metric_key,period_type,period_start_date' },
  )

  if (error) throw new Error(error.message ?? '공무부 데이터 저장에 실패했습니다.')
}

const openInventoryDialog = async () => {
  inventoryError.value = ''
  selectedInventoryMonth.value = new Date(reportYear, reportMonth - 1, 1)
  inventoryDraftWeeks.value = selectedInventoryWeeks.value.map(createInventoryWeekForm)
  isInventoryDialogOpen.value = true
  await loadInventoryDialogMonth()
}

const closeInventoryDialog = () => {
  if (savingInventory.value) return
  inventoryError.value = ''
  inventoryDraftWeeks.value = selectedInventoryWeeks.value.map(createInventoryWeekForm)
  isInventoryDialogOpen.value = false
}

const loadInventoryDialogMonth = async () => {
  inventoryError.value = ''

  try {
    const [weeklyRows, legacyRows] = await Promise.all([
      fetchWeeklyInventoryEntriesByMonth(selectedInventoryMonthValue.value, selectedInventoryMonthEndValue.value),
      fetchLegacyInventoryEntriesByMonth(selectedInventoryMonthValue.value),
    ])
    inventoryDraftWeeks.value = buildInventoryDraftWeeks({
      monthDate: selectedInventoryMonth.value,
      weeklyRows,
      legacyRows,
    })
  } catch (error) {
    inventoryError.value = error?.message ?? '공무부 수치 데이터를 불러오지 못했습니다.'
    inventoryDraftWeeks.value = selectedInventoryWeeks.value.map(createInventoryWeekForm)
  }
}

const moveInventoryDialogMonth = async (delta) => {
  selectedInventoryMonth.value = new Date(selectedInventoryMonth.value.getFullYear(), selectedInventoryMonth.value.getMonth() + delta, 1)
  await loadInventoryDialogMonth()
}

const resetInventoryDialogMonthToCurrent = async () => {
  selectedInventoryMonth.value = new Date(reportYear, reportMonth - 1, 1)
  await loadInventoryDialogMonth()
}

const saveInventory = async () => {
  inventoryError.value = ''
  savingInventory.value = true

  try {
    await ensureOperationsMetricDefinitions()
    const { data: sessionData } = await supabase.auth.getSession()
    const createdBy = sessionData.session?.user?.id ?? null

    await Promise.all(
      inventoryDraftWeeks.value.flatMap((week) => [
        upsertMetricEntry({
          metricKey: METRIC_KEYS.received,
          numericValue: toNumber(week.received),
          createdBy,
          periodStartDate: week.weekStartDate,
          periodEndDate: week.weekEndDate,
          periodType: INVENTORY_PERIOD_TYPE,
        }),
        upsertMetricEntry({
          metricKey: METRIC_KEYS.used,
          numericValue: toNumber(week.used),
          createdBy,
          periodStartDate: week.weekStartDate,
          periodEndDate: week.weekEndDate,
          periodType: INVENTORY_PERIOD_TYPE,
        }),
        upsertMetricEntry({
          metricKey: METRIC_KEYS.balance,
          numericValue: toNumber(week.balance),
          createdBy,
          periodStartDate: week.weekStartDate,
          periodEndDate: week.weekEndDate,
          periodType: INVENTORY_PERIOD_TYPE,
        }),
      ]),
    )

    if (selectedInventoryMonthValue.value === reportMonthValue) {
      const totals = sumInventoryDraftWeeks(inventoryDraftWeeks.value)
      inventoryForm.value = {
        received: String(totals.received),
        used: String(totals.used),
        balance: String(totals.balance),
      }
    }
    closeInventoryDialog()
  } catch (error) {
    inventoryError.value = error?.message ?? '공무 수치 저장에 실패했습니다.'
  } finally {
    savingInventory.value = false
  }
}

const openPrintSettings = () => {
  isPrintSettingsOpen.value = true
}

const printReport = async (options = {}) => {
  isPrintSettingsOpen.value = false
  await printManagementReport(isPrinting, options)
}

onMounted(fetchReportData)
</script>

<template>
  <section class="report-root min-h-screen bg-slate-100">
    <header class="report-header sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-[11px] font-bold tracking-[0.12em] text-slate-500">공무부 보고자료</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900 md:text-xl">공무부 대표 보고</h1>
        </div>
        <div class="flex shrink-0 gap-2">
          <Button class="shrink-0" variant="outline" @click="openPrintSettings">인쇄</Button>
          <Button v-if="props.showBackButton" class="shrink-0" variant="outline" @click="emit('go-back')">가이드로 돌아가기</Button>
        </div>
      </div>

      <div class="mx-auto flex max-w-7xl gap-1 px-4 pb-3 md:px-6">
        <button
          type="button"
          class="rounded-xl px-4 py-2.5 text-[13px] font-bold transition"
          :class="currentPage === 1 ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="currentPage = 1"
        >
          1페이지 · 요약본
        </button>
        <button
          type="button"
          class="rounded-xl px-4 py-2.5 text-[13px] font-bold transition"
          :class="currentPage === 2 ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="currentPage = 2"
        >
          2페이지 · 디테일
        </button>
        <button type="button" class="rounded-xl bg-slate-100 px-4 py-2.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200" @click="openInventoryDialog">
          톤수입력
        </button>
        <button type="button" class="rounded-xl bg-slate-100 px-4 py-2.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200" @click="isWeldingIssueDialogOpen = true">
          오제작/누락분 입력
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500 shadow-sm">공무부 데이터를 불러오는 중입니다.</div>
      <div v-else-if="errorMessage" class="rounded-3xl border border-red-200 bg-red-50 px-4 py-16 text-center text-sm font-semibold text-red-600 shadow-sm">{{ errorMessage }}</div>
      <template v-else>
      <div v-show="currentPage === 1 || isPrinting" class="report-page report-page-break space-y-6">
        <div class="report-print-title">공무부 대표 보고 · 1페이지 요약본</div>
        <section class="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-6 shadow-sm">
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p class="text-[12px] font-bold text-amber-700">{{ reportMonthLabel }} 공무부 보고</p>
              <h2 class="mt-2 text-2xl font-extrabold text-slate-900">{{ reportMonthLabel }} 입고 · 사용 · 잔고</h2>
              <p class="mt-2 text-sm text-slate-600">이번 달 입력값 기준입니다.</p>
            </div>
            <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm">
              <p class="text-[12px] font-bold text-amber-700">총 잔고</p>
              <p class="mt-1 text-4xl font-extrabold text-slate-900">{{ summaryCards[2].value }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="grid gap-3 md:grid-cols-3">
            <div v-for="card in summaryCards" :key="card.label" class="rounded-2xl border p-4" :class="card.tone">
              <p class="text-[13px] font-bold">{{ card.label }}</p>
              <p class="mt-2 text-2xl font-extrabold">{{ card.value }}</p>
              <p class="mt-1 text-[11px] font-semibold opacity-80">{{ card.note }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[13px] font-extrabold text-slate-900">{{ weldingComparisonTitle }}</p>
            <p class="text-[12px] text-slate-500">최근 3개월</p>
          </div>

          <div class="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-slate-50">
                  <th class="border border-slate-200 px-3 py-2.5 text-center text-xs font-bold text-slate-500">담당자</th>
                  <th class="border border-slate-200 px-3 py-2.5 text-center text-xs font-bold text-slate-500">구분</th>
                  <th
                    v-for="month in monthlyWeldingMetrics"
                    :key="month.key"
                    class="border border-slate-200 px-4 py-2.5 text-center text-xs font-bold"
                    :class="month.key === reportPeriodMonth ? 'bg-blue-50 text-blue-700' : 'text-slate-500'"
                  >{{ month.label }}<span v-if="month.key === reportPeriodMonth" class="ml-1 text-[9px] opacity-60">현재까지</span></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(manager, mIdx) in weldingComparisonManagers" :key="manager">
                  <tr :class="mIdx > 0 ? 'border-t-2 border-slate-300' : ''">
                    <td class="border border-slate-200 px-3 text-center text-xs font-extrabold text-slate-800" rowspan="3">{{ manager }}</td>
                    <td class="border border-slate-200 px-3 py-0 text-center text-xs font-semibold text-slate-600" style="height:48px">완료 헤드</td>
                    <td v-for="month in monthlyWeldingMetrics" :key="month.key" class="border border-slate-200 px-4 py-0 text-center" style="height:48px">
                      <template v-if="month.metrics[manager].completedHead > 0">
                        <span class="text-lg font-extrabold text-slate-900">{{ formatCount(month.metrics[manager].completedHead) }}</span>
                        <span class="ml-1 text-[11px] text-slate-400">EA</span>
                      </template>
                    </td>
                  </tr>
                  <tr>
                    <td class="border border-slate-200 px-3 py-0 text-center text-xs font-semibold text-slate-600" style="height:48px">오제작</td>
                    <td v-for="month in monthlyWeldingMetrics" :key="month.key" class="border border-slate-200 px-4 py-0 text-center" style="height:48px">
                      <template v-if="month.metrics[manager].misproductionCount > 0">
                        <span class="text-lg font-extrabold text-amber-600">{{ month.metrics[manager].misproductionCount }}</span>
                        <span class="ml-1 text-[11px] text-slate-400">건</span>
                      </template>
                    </td>
                  </tr>
                  <tr>
                    <td class="border border-slate-200 px-3 py-0 text-center text-xs font-semibold text-slate-600" style="height:48px">누락분</td>
                    <td v-for="month in monthlyWeldingMetrics" :key="month.key" class="border border-slate-200 px-4 py-0 text-center" style="height:48px">
                      <template v-if="month.metrics[manager].shortageCount > 0">
                        <span class="text-lg font-extrabold text-rose-600">{{ month.metrics[manager].shortageCount }}</span>
                        <span class="ml-1 text-[11px] text-slate-400">건</span>
                      </template>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </section>

        <!-- 오제작/누락분 입력 다이얼로그 -->
        <div
          v-if="isWeldingIssueDialogOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          @click.self="isWeldingIssueDialogOpen = false; weldingIssueCompanySearchText = ''; weldingIssueCompanySearchResults = []"
        >
          <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 class="mb-4 text-base font-extrabold text-slate-900">오제작 / 누락분 입력</h3>
            <div class="space-y-3">
              <div>
                <p class="mb-1.5 text-xs font-bold text-slate-600">구분</p>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition"
                    :class="weldingIssueForm.issue_type === 'misproduction' ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'"
                    @click="weldingIssueForm.issue_type = 'misproduction'"
                  >오제작</button>
                  <button
                    type="button"
                    class="flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition"
                    :class="weldingIssueForm.issue_type === 'shortage' ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'"
                    @click="weldingIssueForm.issue_type = 'shortage'"
                  >누락분</button>
                </div>
              </div>
              <div>
                <p class="mb-1.5 text-xs font-bold text-slate-600">담당자</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="name in weldingIssueManagerOptions"
                    :key="name"
                    type="button"
                    class="min-w-[72px] flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition"
                    :class="weldingIssueForm.inspector === name ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'"
                    @click="weldingIssueForm.inspector = name"
                  >{{ name }}</button>
                </div>
              </div>
              <div>
                <p class="mb-1 text-xs font-bold text-slate-600">회사명 / 현장명 검색</p>
                <div class="flex gap-2">
                  <input
                    v-model="weldingIssueCompanySearchText"
                    type="text"
                    placeholder="회사명 또는 현장명 검색"
                    class="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                    @keydown.enter.prevent="searchWeldingIssueCompanies"
                  />
                  <button
                    type="button"
                    class="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    @click="searchWeldingIssueCompanies"
                  >검색</button>
                </div>
                <div v-if="weldingIssueCompanySearchLoading" class="mt-1 text-[11px] text-slate-500">검색 중...</div>
                <ul v-if="weldingIssueCompanySearchResults.length > 0" class="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  <li
                    v-for="item in weldingIssueCompanySearchResults"
                    :key="item.id"
                    class="cursor-pointer px-3 py-2 text-sm hover:bg-indigo-50"
                    @click="selectWeldingIssueCompany(item)"
                  >
                    <span class="font-semibold text-slate-800">{{ item.company }}</span>
                    <span v-if="item.place" class="ml-1 text-slate-500">· {{ item.place }}</span>
                  </li>
                </ul>
                <div v-if="weldingIssueForm.company || weldingIssueForm.place" class="mt-1.5 flex gap-2 text-[11px]">
                  <span class="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{{ weldingIssueForm.company || '-' }}</span>
                  <span class="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{{ weldingIssueForm.place || '-' }}</span>
                </div>
              </div>
              <div>
                <p class="mb-1 text-xs font-bold text-slate-600">구역명</p>
                <input v-model="weldingIssueForm.area" type="text" placeholder="구역명" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
              </div>
              <div>
                <p class="mb-1 text-xs font-bold text-slate-600">헤드수</p>
                <input
                  :value="weldingIssueForm.head_count"
                  type="text"
                  inputmode="numeric"
                  placeholder="0"
                  class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  @input="weldingIssueForm.head_count = sanitizeCountInput($event.target.value)"
                />
              </div>
              <div>
                <p class="mb-1 text-xs font-bold text-slate-600">메모</p>
                <input v-model="weldingIssueForm.memo" type="text" placeholder="메모 (선택)" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
              </div>
              <p v-if="weldingIssueError" class="text-xs font-semibold text-red-600">{{ weldingIssueError }}</p>
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                @click="isWeldingIssueDialogOpen = false; weldingIssueCompanySearchText = ''; weldingIssueCompanySearchResults = []"
              >닫기</button>
              <button type="button" class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50" :disabled="savingWeldingIssue" @click="saveWeldingIssue">
                {{ savingWeldingIssue ? '저장 중...' : '저장' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-show="currentPage === 2 || isPrinting" class="report-page space-y-6">
        <div class="report-print-title">공무부 대표 보고 · 2페이지 디테일</div>

        <!-- 작업 현황 -->
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p class="mb-4 text-[13px] font-extrabold text-slate-900">{{ weldingStatusTitle }}</p>
          <div class="space-y-5">
            <div v-for="manager in weldingComparisonManagers" :key="`ws-${manager}`">
              <p class="mb-2 text-[12px] font-bold text-slate-700">{{ manager }} 작업 현황</p>
              <div v-if="weldingMetrics[manager].inspectionRows.length === 0" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                이번 달 데이터 없음
              </div>
              <div v-else class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="w-full table-fixed border-collapse text-xs">
                  <colgroup>
                    <col style="width: 72px" />
                    <col style="width: 110px" />
                    <col style="width: 110px" />
                    <col style="width: 190px" />
                    <col />
                    <col style="width: 65px" />
                    <col style="width: 120px" />
                  </colgroup>
                  <thead>
                    <tr class="bg-slate-50 text-slate-600">
                      <th class="border border-slate-200 px-2 py-2 text-center font-bold">상태</th>
                      <th class="border border-slate-200 px-2 py-2 text-center font-bold">도번</th>
                      <th class="border border-slate-200 px-2 py-2 text-center font-bold">회사명</th>
                      <th class="border border-slate-200 px-2 py-2 text-center font-bold">현장명</th>
                      <th class="border border-slate-200 px-2 py-2 text-center font-bold">구역명</th>
                      <th class="border border-slate-200 px-2 py-2 text-center font-bold">헤드</th>
                      <th class="border border-slate-200 px-2 py-2 text-center font-bold whitespace-nowrap">검수일</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in weldingMetrics[manager].inspectionRows"
                      :key="item.id"
                      class="hover:bg-slate-50/60"
                    >
                      <td class="border border-slate-200 px-2 py-2 text-center">
                        <span
                          class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          :class="item.welding_status === '작업완료' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
                        >{{ item.welding_status }}</span>
                      </td>
                      <td class="border border-slate-200 px-2 py-2 text-center">{{ item.drawing_no || '-' }}</td>
                      <td class="border border-slate-200 px-2 py-2 text-center">{{ item.company || '-' }}</td>
                      <td class="border border-slate-200 px-2 py-2 text-center">{{ item.place || '-' }}</td>
                      <td class="border border-slate-200 px-2 py-2 text-center">{{ item.area || '-' }}</td>
                      <td class="border border-slate-200 px-2 py-2 text-center font-semibold">{{ formatCount(item.head_count) }}</td>
                      <td class="border border-slate-200 px-2 py-2 text-center whitespace-nowrap">{{ formatTestDateShort(item.test_date) || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <!-- 오제작/누락분 목록 -->
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p class="mb-4 text-[13px] font-extrabold text-slate-900">오제작 / 누락분 목록</p>
          <div v-if="weldingIssues.length === 0" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            등록된 항목이 없습니다.
          </div>
          <div v-else class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 text-slate-600">
                  <th class="border border-slate-200 px-3 py-2 text-center font-bold">구분</th>
                  <th class="border border-slate-200 px-3 py-2 text-center font-bold">담당자</th>
                  <th class="border border-slate-200 px-3 py-2 text-center font-bold">회사명</th>
                  <th class="border border-slate-200 px-3 py-2 text-center font-bold">현장명</th>
                  <th class="border border-slate-200 px-3 py-2 text-center font-bold">구역명</th>
                  <th class="border border-slate-200 px-3 py-2 text-center font-bold">헤드수</th>
                  <th class="border border-slate-200 px-3 py-2 text-center font-bold">메모</th>
                  <th class="border border-slate-200 px-3 py-2 text-center font-bold"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in weldingIssues" :key="item.id" class="hover:bg-slate-50/60">
                  <td class="border border-slate-200 px-3 py-2 text-center">
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      :class="item.issue_type === 'misproduction' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'"
                    >{{ item.issue_type === 'misproduction' ? '오제작' : '누락분' }}</span>
                  </td>
                  <td class="border border-slate-200 px-3 py-2 text-center font-semibold">{{ item.inspector }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ item.company || '-' }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ item.place || '-' }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ item.area || '-' }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center font-semibold">{{ item.head_count || '-' }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ item.memo || '-' }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">
                    <button
                      type="button"
                      class="text-[11px] font-semibold text-red-500 hover:text-red-700 disabled:opacity-40"
                      :disabled="deletingWeldingIssueId === item.id"
                      @click="deleteWeldingIssue(item.id)"
                    >삭제</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </div>
      </template>
    </main>

    <div v-if="isInventoryDialogOpen" class="report-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div class="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl md:p-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[13px] font-extrabold text-slate-900">공무 톤수 입력</p>
            <div class="mt-2 flex items-center gap-2">
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" @click="moveInventoryDialogMonth(-1)">&lt;</button>
              <p class="min-w-[110px] text-center text-[13px] font-bold text-slate-700">{{ selectedInventoryMonthLabel }}</p>
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" @click="moveInventoryDialogMonth(1)">&gt;</button>
              <button
                type="button"
                class="ml-1 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition"
                :class="isCurrentInventoryMonth ? 'border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                :disabled="isCurrentInventoryMonth"
                @click="resetInventoryDialogMonthToCurrent"
              >
                이번달로
              </button>
            </div>
            <p class="mt-2 text-[12px] text-slate-500">기본은 현재달이며, 이전 달 톤수도 선택해서 입력할 수 있습니다.</p>
          </div>
          <button type="button" class="text-sm font-semibold text-slate-500 hover:text-slate-700" :disabled="savingInventory" @click="closeInventoryDialog">닫기</button>
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-600">
                <th class="border border-slate-200 px-3 py-2 text-center">주차</th>
                <th class="border border-slate-200 px-3 py-2 text-center">입고</th>
                <th class="border border-slate-200 px-3 py-2 text-center">사용</th>
                <th class="border border-slate-200 px-3 py-2 text-center">잔고</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="week in inventoryDraftWeeks" :key="week.weekStartDate" class="bg-white">
                <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">
                  {{ selectedInventoryMonthLabel }} {{ week.weekLabel }}
                  <p class="mt-1 text-[11px] font-medium text-slate-500">{{ week.weekRangeLabel }}</p>
                </td>
                <td class="border border-slate-200 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <input
                      :value="week.received"
                      type="text"
                      inputmode="decimal"
                      class="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      placeholder="0"
                      @input="week.received = sanitizeDecimalInput($event.target.value)"
                    />
                    <span class="shrink-0 text-xs font-semibold text-slate-500">톤</span>
                  </div>
                </td>
                <td class="border border-slate-200 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <input
                      :value="week.used"
                      type="text"
                      inputmode="decimal"
                      class="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      placeholder="0"
                      @input="week.used = sanitizeDecimalInput($event.target.value)"
                    />
                    <span class="shrink-0 text-xs font-semibold text-slate-500">톤</span>
                  </div>
                </td>
                <td class="border border-slate-200 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <input
                      :value="week.balance"
                      type="text"
                      inputmode="decimal"
                      class="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      placeholder="0"
                      @input="week.balance = sanitizeDecimalInput($event.target.value)"
                    />
                    <span class="shrink-0 text-xs font-semibold text-slate-500">톤</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="inventoryError" class="mt-4 text-sm font-bold text-red-600">{{ inventoryError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <Button class="h-10 px-4 text-sm" variant="outline" :disabled="savingInventory" @click="closeInventoryDialog">닫기</Button>
          <Button class="h-10 px-4 text-sm" :disabled="savingInventory" @click="saveInventory">{{ savingInventory ? '저장 중...' : '저장' }}</Button>
        </div>
      </div>
    </div>

    <ReportPrintSettingsDialog
      :open="isPrintSettingsOpen"
      @close="isPrintSettingsOpen = false"
      @print="printReport"
    />
  </section>
</template>

<style scoped>
.report-print-title {
  display: none;
}

@media print {
  @page {
    margin: 8mm;
  }

  :global(html),
  :global(body) {
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .report-root {
    min-height: auto !important;
    background: #fff !important;
  }

  .report-header,
  .report-dialog,
  .report-action-cell {
    display: none !important;
  }

  .report-page {
    display: block !important;
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .report-page-break {
    break-after: page;
    page-break-after: always;
  }

  .report-print-title {
    display: none !important;
  }

  .report-root :deep(main) {
    max-width: none !important;
    background: #fff !important;
  }

  .report-page > * {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .operations-print-grid-5 {
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  }
}
</style>
