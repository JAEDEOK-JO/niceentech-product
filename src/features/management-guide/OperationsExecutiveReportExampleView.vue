<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'

const COMPANY_LIST_TABLE = 'company_list'
const METRIC_DEFINITIONS_TABLE = 'department_metric_definitions'
const METRIC_ENTRIES_TABLE = 'department_metric_entries'
const DEPARTMENT_CODE = 'operations'
const INVENTORY_PERIOD_TYPE = 'weekly'
const LEGACY_INVENTORY_PERIOD_TYPE = 'monthly'
const ISSUE_PERIOD_TYPE = 'monthly'
const METRIC_KEYS = {
  received: 'monthly_received_ton',
  used: 'monthly_used_ton',
  balance: 'monthly_balance_ton',
  issueEntries: 'monthly_issue_entries_json',
}
const MANAGERS = ['진민택', '민뚜라']

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

const currentPage = ref(1)
const loading = ref(false)
const errorMessage = ref('')
const isPrinting = ref(false)
const isInventoryDialogOpen = ref(false)
const isIssueDialogOpen = ref(false)
const selectedInventoryMonth = ref(new Date(reportYear, reportMonth - 1, 1))
const inventoryError = ref('')
const issueEntryError = ref('')
const savingInventory = ref(false)
const savingIssueEntry = ref(false)
const deletingIssueEntry = ref(false)
const editingIssueId = ref(null)
const selectedIssueDetailRow = ref(null)
const issueCompanySearchText = ref('')
const issueCompanySearchLoading = ref(false)
const issueCompanySearchResults = ref([])
const totalBalanceSum = ref(0)

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
const issueTypeLabelMap = {
  misproduction: '오제작',
  shortage: '누락분',
}

const operationsMetricDefinitions = [
  { metric_key: METRIC_KEYS.received, label: '주간 입고', value_type: 'number', unit: '톤', sort_order: 1, is_active: true },
  { metric_key: METRIC_KEYS.used, label: '주간 사용', value_type: 'number', unit: '톤', sort_order: 2, is_active: true },
  { metric_key: METRIC_KEYS.balance, label: '주간 잔고', value_type: 'number', unit: '톤', sort_order: 3, is_active: true },
  { metric_key: METRIC_KEYS.issueEntries, label: '월 이슈 목록', value_type: 'text', unit: '', sort_order: 4, is_active: true },
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

const createIssueId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const createDefaultIssueForm = (row = null, issueType = 'misproduction') =>
  row
    ? {
        reportedAt: row.reportedAt ?? formatDateInput(new Date()),
        manager: row.manager ?? MANAGERS[0],
        company: row.company ?? '',
        place: row.place ?? '',
        area: row.area ?? '',
        headCount: String(row.headCount ?? ''),
        installCount: String(row.installCount ?? ''),
        detail: row.detail ?? '',
        issueType: row.issueType ?? issueType,
      }
    : {
        reportedAt: formatDateInput(new Date()),
        manager: MANAGERS[0],
        company: '',
        place: '',
        area: '',
        headCount: '',
        installCount: '',
        detail: '',
        issueType,
      }

const normalizeIssueEntry = (row, index = 0) => ({
  id: normalizeText(row?.id) || `issue-${index + 1}`,
  reportedAt: normalizeText(row?.reportedAt),
  manager: MANAGERS.includes(row?.manager) ? row.manager : MANAGERS[0],
  company: normalizeText(row?.company),
  place: normalizeText(row?.place),
  area: normalizeText(row?.area),
  headCount: toNumber(row?.headCount),
  installCount: toNumber(row?.installCount),
  issueType: row?.issueType === 'shortage' ? 'shortage' : 'misproduction',
  detail: normalizeText(row?.detail),
})

const inventoryForm = ref(createDefaultInventoryForm())
const inventoryDraftWeeks = ref([])
const issueEntries = ref([])
const issueForm = ref(createDefaultIssueForm())

const sortIssueEntries = (rows) =>
  [...rows].sort((a, b) => String(b.reportedAt ?? '').localeCompare(String(a.reportedAt ?? '')) || String(b.id ?? '').localeCompare(String(a.id ?? '')))

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

const fetchMetricEntries = async () => {
  const { data, error } = await supabase
    .from(METRIC_ENTRIES_TABLE)
    .select('metric_key,numeric_value,text_value')
    .eq('department_code', DEPARTMENT_CODE)
    .eq('period_type', ISSUE_PERIOD_TYPE)
    .eq('period_start_date', reportMonthValue)

  if (error) throw new Error(error.message ?? '공무부 데이터를 불러오지 못했습니다.')
  return data ?? []
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
    const [rows, weeklyInventoryRows, legacyInventoryRows, balanceRows] = await Promise.all([
      fetchMetricEntries(),
      fetchWeeklyInventoryEntriesByMonth(reportMonthValue, reportMonthEndValue),
      fetchLegacyInventoryEntriesByMonth(reportMonthValue),
      fetchAllBalanceEntries(),
    ])
    const entryMap = Object.fromEntries(rows.map((row) => [String(row.metric_key ?? '').trim(), row]))
    totalBalanceSum.value = balanceRows.reduce((sum, row) => sum + toNumber(row?.numeric_value), 0)
    const inventoryTotals = weeklyInventoryRows.length > 0 ? sumInventoryRows(weeklyInventoryRows) : sumInventoryRows(legacyInventoryRows)

    inventoryForm.value = {
      received: String(inventoryTotals.received),
      used: String(inventoryTotals.used),
      balance: String(inventoryTotals.balance),
    }

    const rawIssueJson = normalizeText(entryMap[METRIC_KEYS.issueEntries]?.text_value)
    if (!rawIssueJson) {
      issueEntries.value = []
    } else {
      try {
        const parsed = JSON.parse(rawIssueJson)
        issueEntries.value = Array.isArray(parsed) ? sortIssueEntries(parsed.map(normalizeIssueEntry)) : []
      } catch {
        issueEntries.value = []
      }
    }
  } catch (error) {
    errorMessage.value = error?.message ?? '공무부 데이터를 불러오지 못했습니다.'
    inventoryForm.value = createDefaultInventoryForm()
    inventoryDraftWeeks.value = []
    issueEntries.value = []
    totalBalanceSum.value = 0
  } finally {
    loading.value = false
  }
}

const inventoryValues = computed(() => ({
  received: toNumber(inventoryForm.value.received),
  used: toNumber(inventoryForm.value.used),
  balance: toNumber(inventoryForm.value.balance),
}))

const misproductionRows = computed(() => issueEntries.value.filter((row) => row.issueType === 'misproduction'))
const shortageRows = computed(() => issueEntries.value.filter((row) => row.issueType === 'shortage'))

const sumHeadCount = (rows) => rows.reduce((sum, row) => sum + toNumber(row.headCount), 0)
const sumInstallCount = (rows) => rows.reduce((sum, row) => sum + toNumber(row.installCount), 0)

const misproductionHeadTotal = computed(() => sumHeadCount(misproductionRows.value))
const shortageHeadTotal = computed(() => sumHeadCount(shortageRows.value))
const misproductionInstallTotal = computed(() => sumInstallCount(misproductionRows.value))
const shortageInstallTotal = computed(() => sumInstallCount(shortageRows.value))

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

const managerMetrics = computed(() => {
  const initialState = MANAGERS.reduce((accumulator, manager) => {
    accumulator[manager] = { headCount: 0, installCount: 0, misproductionCount: 0, shortageCount: 0 }
    return accumulator
  }, {})

  for (const row of issueEntries.value) {
    const manager = MANAGERS.includes(row.manager) ? row.manager : MANAGERS[0]
    initialState[manager].headCount += toNumber(row.headCount)
    initialState[manager].installCount += toNumber(row.installCount)
    if (row.issueType === 'misproduction') initialState[manager].misproductionCount += 1
    if (row.issueType === 'shortage') initialState[manager].shortageCount += 1
  }

  return initialState
})

const partnerComparisonRows = computed(() => [
  {
    label: '헤드',
    jinminTech: managerMetrics.value['진민택'].headCount,
    minTura: managerMetrics.value['민뚜라'].headCount,
    compareMode: 'neutral',
  },
  {
    label: '전실/입상',
    jinminTech: managerMetrics.value['진민택'].installCount,
    minTura: managerMetrics.value['민뚜라'].installCount,
    compareMode: 'neutral',
  },
  {
    label: '오제작',
    jinminTech: managerMetrics.value['진민택'].misproductionCount,
    minTura: managerMetrics.value['민뚜라'].misproductionCount,
    compareMode: 'higher-bad',
  },
  {
    label: '누락분',
    jinminTech: managerMetrics.value['진민택'].shortageCount,
    minTura: managerMetrics.value['민뚜라'].shortageCount,
    compareMode: 'higher-bad',
  },
])

const isBadValue = (value, otherValue, compareMode) => compareMode === 'higher-bad' && Number(value || 0) > Number(otherValue || 0)
const getComparisonTextClass = (value, otherValue, compareMode) =>
  isBadValue(value, otherValue, compareMode) ? 'text-red-500' : 'text-slate-900'

const openIssueDetailDialog = (row) => {
  selectedIssueDetailRow.value = row
}

const closeIssueDetailDialog = () => {
  if (deletingIssueEntry.value) return
  selectedIssueDetailRow.value = null
}

const searchIssueCompanies = async () => {
  const term = normalizeText(issueCompanySearchText.value)
  if (!term) {
    issueCompanySearchResults.value = []
    return
  }

  issueCompanySearchLoading.value = true
  const { data, error } = await supabase
    .from(COMPANY_LIST_TABLE)
    .select('id,company,place,full_name')
    .ilike('full_name', `%${term}%`)
    .order('full_name', { ascending: true })
    .limit(20)
  issueCompanySearchLoading.value = false

  if (error) {
    issueEntryError.value = error.message ?? '회사 검색에 실패했습니다.'
    return
  }

  issueCompanySearchResults.value = (data ?? []).map((item) => ({
    id: item.id,
    company: normalizeText(item.company),
    place: normalizeText(item.place),
    fullName: normalizeText(item.full_name),
  }))
}

const selectIssueCompany = (item) => {
  issueForm.value.company = item.company
  issueForm.value.place = item.place
  issueCompanySearchText.value = item.fullName || `${item.company} ${item.place}`.trim()
  issueCompanySearchResults.value = []
}

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

const saveIssueEntries = async (nextEntries, createdBy = null) => {
  await ensureOperationsMetricDefinitions()
  await upsertMetricEntry({
    metricKey: METRIC_KEYS.issueEntries,
    numericValue: null,
    textValue: JSON.stringify(nextEntries),
    createdBy,
    periodType: ISSUE_PERIOD_TYPE,
    periodStartDate: reportMonthValue,
    periodEndDate: reportMonthEndValue,
  })
  issueEntries.value = sortIssueEntries(nextEntries)
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

const openIssueDialog = (row = null, issueType = 'misproduction') => {
  issueEntryError.value = ''
  editingIssueId.value = row?.id ?? null
  issueForm.value = createDefaultIssueForm(row, issueType)
  issueCompanySearchText.value = row ? `${row.company ?? ''} ${row.place ?? ''}`.trim() : ''
  issueCompanySearchResults.value = []
  isIssueDialogOpen.value = true
}

const closeIssueDialog = () => {
  if (savingIssueEntry.value || deletingIssueEntry.value) return
  issueEntryError.value = ''
  editingIssueId.value = null
  issueForm.value = createDefaultIssueForm()
  issueCompanySearchText.value = ''
  issueCompanySearchResults.value = []
  isIssueDialogOpen.value = false
}

const saveIssueEntry = async () => {
  issueEntryError.value = ''

  const payload = {
    id: editingIssueId.value ?? createIssueId(),
    reportedAt: normalizeText(issueForm.value.reportedAt),
    manager: MANAGERS.includes(issueForm.value.manager) ? issueForm.value.manager : MANAGERS[0],
    company: normalizeText(issueForm.value.company),
    place: normalizeText(issueForm.value.place),
    area: normalizeText(issueForm.value.area),
    headCount: toNumber(issueForm.value.headCount),
    installCount: toNumber(issueForm.value.installCount),
    detail: normalizeText(issueForm.value.detail),
    issueType: issueForm.value.issueType === 'shortage' ? 'shortage' : 'misproduction',
  }

  if (!payload.reportedAt) {
    issueEntryError.value = '접수일을 입력해주세요.'
    return
  }
  if (!payload.company) {
    issueEntryError.value = '회사명을 입력해주세요.'
    return
  }
  if (!payload.place) {
    issueEntryError.value = '현장명을 입력해주세요.'
    return
  }
  if (!payload.area) {
    issueEntryError.value = '구역을 입력해주세요.'
    return
  }
  if (!payload.detail) {
    issueEntryError.value = '내용을 입력해주세요.'
    return
  }

  savingIssueEntry.value = true

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const createdBy = sessionData.session?.user?.id ?? null
    const nextEntries = [...issueEntries.value.filter((row) => row.id !== payload.id), payload]
    await saveIssueEntries(nextEntries, createdBy)
    closeIssueDialog()
  } catch (error) {
    issueEntryError.value = error?.message ?? '공무 이슈 저장에 실패했습니다.'
  } finally {
    savingIssueEntry.value = false
  }
}

const deleteIssueEntry = async (rowId) => {
  issueEntryError.value = ''
  const targetRow = issueEntries.value.find((row) => row.id === rowId)
  const confirmed = typeof window === 'undefined' ? true : window.confirm(`${targetRow?.company || '선택한'} 항목을 삭제할까요?`)
  if (!confirmed) return

  deletingIssueEntry.value = true

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const createdBy = sessionData.session?.user?.id ?? null
    const nextEntries = issueEntries.value.filter((row) => row.id !== rowId)
    await saveIssueEntries(nextEntries, createdBy)
    if (editingIssueId.value === rowId) closeIssueDialog()
    if (selectedIssueDetailRow.value?.id === rowId) closeIssueDetailDialog()
  } catch (error) {
    issueEntryError.value = error?.message ?? '공무 이슈 삭제에 실패했습니다.'
  } finally {
    deletingIssueEntry.value = false
  }
}

const printReport = async () => {
  if (typeof window === 'undefined') return
  isPrinting.value = true
  await nextTick()
  window.print()
  isPrinting.value = false
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
          <p class="mt-2 text-[13px] text-slate-600">입고, 사용, 잔고와 오제작/누락분 현황을 함께 정리합니다.</p>
        </div>
        <div class="flex shrink-0 gap-2">
          <Button class="shrink-0" variant="outline" @click="printReport">인쇄</Button>
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
        <button type="button" class="rounded-xl bg-slate-100 px-4 py-2.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200" @click="openIssueDialog()">
          이슈입력
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
              <p class="mt-2 text-sm text-slate-600">입력한 수치를 기준으로 이번 달 현황이 바로 반영됩니다.</p>
            </div>
            <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm">
              <p class="text-[12px] font-bold text-amber-700">총 잔고</p>
              <p class="mt-1 text-4xl font-extrabold text-slate-900">{{ summaryCards[2].value }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="operations-print-grid-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div v-for="card in summaryCards" :key="card.label" class="rounded-2xl border p-4" :class="card.tone">
              <p class="text-[13px] font-bold">{{ card.label }}</p>
              <p class="mt-2 text-2xl font-extrabold">{{ card.value }}</p>
              <p class="mt-1 text-[11px] font-semibold opacity-80">{{ card.note }}</p>
            </div>
            <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p class="text-[13px] font-bold text-amber-800">오제작</p>
              <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ misproductionRows.length }}건</p>
              <p class="mt-1 text-[11px] font-semibold text-amber-700">입력 목록 기준 자동 집계</p>
            </article>
            <article class="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p class="text-[13px] font-bold text-rose-800">누락분</p>
              <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ shortageRows.length }}건</p>
              <p class="mt-1 text-[11px] font-semibold text-rose-700">입력 목록 기준 자동 집계</p>
            </article>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[13px] font-extrabold text-slate-900">진민택 / 민뚜라 비교</p>
            <p class="mt-1 text-[12px] text-slate-500">입력한 이슈 데이터를 기준으로 자동 계산됩니다.</p>
          </div>
          <div class="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div class="grid grid-cols-[120px_1fr_1fr] border-b border-slate-200 px-5 py-4 text-sm font-bold text-slate-700">
              <div class="text-left">구분</div>
              <div class="text-center">진민택</div>
              <div class="text-center">민뚜라</div>
            </div>
            <div
              v-for="row in partnerComparisonRows"
              :key="row.label"
              class="grid grid-cols-[120px_1fr_1fr] items-center border-b border-slate-200 px-5 py-5 last:border-b-0"
            >
              <div class="text-left text-base font-extrabold text-slate-900">{{ row.label }}</div>
              <div class="text-center">
                <p
                  class="text-2xl font-extrabold"
                  :class="getComparisonTextClass(row.jinminTech, row.minTura, row.compareMode)"
                >
                  {{ formatCount(row.jinminTech) }}
                </p>
              </div>
              <div class="text-center">
                <p
                  class="text-2xl font-extrabold"
                  :class="getComparisonTextClass(row.minTura, row.jinminTech, row.compareMode)"
                >
                  {{ formatCount(row.minTura) }}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div v-show="currentPage === 2 || isPrinting" class="report-page space-y-6">
        <div class="report-print-title">공무부 대표 보고 · 2페이지 디테일</div>
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[13px] font-extrabold text-slate-900">오제작 목록</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">{{ misproductionRows.length }}건</span>
              <Button class="h-9 px-3 text-xs" variant="outline" @click="openIssueDialog(null, 'misproduction')">오제작 입력</Button>
            </div>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full border-separate border-spacing-0 text-sm table-fixed">
              <colgroup>
                <col class="w-[9%]" />
                <col class="w-[7%]" />
                <col class="w-[12%]" />
                <col class="w-[14%]" />
                <col class="w-[15%]" />
                <col class="w-[8%]" />
                <col class="w-[9%]" />
                <col class="w-[27%]" />
              </colgroup>
              <thead>
                <tr class="bg-slate-50 text-slate-600">
                  <th class="border border-slate-200 px-3 py-2 text-center">접수일</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">담당자</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">회사</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">현장</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">구역</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">헤드수</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">전실/입상</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">내용</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="misproductionRows.length === 0" class="bg-white">
                  <td colspan="8" class="border border-slate-200 px-3 py-8 text-center text-slate-500">등록된 오제작 항목이 없습니다.</td>
                </tr>
                <tr v-for="row in misproductionRows" :key="`${row.reportedAt}-${row.place}`" class="bg-white">
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ formatShortDate(row.reportedAt) }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center font-semibold">{{ row.manager }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.company }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.place }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.area }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ formatHeadCount(row.headCount) }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ formatHeadCount(row.installCount) }}</td>
                  <td class="border border-slate-200 px-4 py-2 text-left align-top">
                    <button type="button" class="block w-full text-left whitespace-pre-wrap break-words leading-6 text-slate-700 hover:text-slate-900" @click="openIssueDetailDialog(row)">
                      {{ row.detail }}
                    </button>
                  </td>
                </tr>
                <tr class="bg-slate-50 font-bold text-slate-900">
                  <td colspan="5" class="border border-slate-200 px-3 py-2 text-center">합계</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ formatHeadCount(misproductionHeadTotal) }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ formatHeadCount(misproductionInstallTotal) }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[13px] font-extrabold text-slate-900">누락분 목록</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700">{{ shortageRows.length }}건</span>
              <Button class="h-9 px-3 text-xs" variant="outline" @click="openIssueDialog(null, 'shortage')">누락분 입력</Button>
            </div>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full border-separate border-spacing-0 text-sm table-fixed">
              <colgroup>
                <col class="w-[9%]" />
                <col class="w-[8%]" />
                <col class="w-[12%]" />
                <col class="w-[14%]" />
                <col class="w-[15%]" />
                <col class="w-[8%]" />
                <col class="w-[9%]" />
                <col class="w-[26%]" />
              </colgroup>
              <thead>
                <tr class="bg-slate-50 text-slate-600">
                  <th class="border border-slate-200 px-3 py-2 text-center">접수일</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">담당자</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">회사</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">현장</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">구역</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">헤드수</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">전실/입상</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">내용</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="shortageRows.length === 0" class="bg-white">
                  <td colspan="8" class="border border-slate-200 px-3 py-8 text-center text-slate-500">등록된 누락분 항목이 없습니다.</td>
                </tr>
                <tr v-for="row in shortageRows" :key="`${row.reportedAt}-${row.place}`" class="bg-white">
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ formatShortDate(row.reportedAt) }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center font-semibold">{{ row.manager }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.company }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.place }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.area }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ formatHeadCount(row.headCount) }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ formatHeadCount(row.installCount) }}</td>
                  <td class="border border-slate-200 px-4 py-2 text-left align-top">
                    <button type="button" class="block w-full text-left whitespace-pre-wrap break-words leading-6 text-slate-700 hover:text-slate-900" @click="openIssueDetailDialog(row)">
                      {{ row.detail }}
                    </button>
                  </td>
                </tr>
                <tr class="bg-slate-50 font-bold text-slate-900">
                  <td colspan="5" class="border border-slate-200 px-3 py-2 text-center">합계</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ formatHeadCount(shortageHeadTotal) }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ formatHeadCount(shortageInstallTotal) }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">-</td>
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

    <div v-if="selectedIssueDetailRow" class="report-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div class="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl md:p-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[13px] font-extrabold text-slate-900">{{ issueTypeLabelMap[selectedIssueDetailRow.issueType] || '이슈' }} 상세</p>
            <p class="mt-1 text-[12px] text-slate-500">{{ selectedIssueDetailRow.company || '-' }} · {{ selectedIssueDetailRow.place || '-' }}</p>
          </div>
          <button type="button" class="text-sm font-semibold text-slate-500 hover:text-slate-700" :disabled="deletingIssueEntry" @click="closeIssueDetailDialog">닫기</button>
        </div>
        <div class="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
          <div>
            <p class="text-[11px] font-bold text-slate-500">접수일</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatShortDate(selectedIssueDetailRow.reportedAt) }}</p>
          </div>
          <div>
            <p class="text-[11px] font-bold text-slate-500">담당자</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ selectedIssueDetailRow.manager || '-' }}</p>
          </div>
          <div>
            <p class="text-[11px] font-bold text-slate-500">회사</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ selectedIssueDetailRow.company || '-' }}</p>
          </div>
          <div>
            <p class="text-[11px] font-bold text-slate-500">현장</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ selectedIssueDetailRow.place || '-' }}</p>
          </div>
          <div>
            <p class="text-[11px] font-bold text-slate-500">구역</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ selectedIssueDetailRow.area || '-' }}</p>
          </div>
          <div>
            <p class="text-[11px] font-bold text-slate-500">헤드 / 전실·입상</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatHeadCount(selectedIssueDetailRow.headCount) }} / {{ formatHeadCount(selectedIssueDetailRow.installCount) }}</p>
          </div>
          <div class="md:col-span-2">
            <p class="text-[11px] font-bold text-slate-500">내용</p>
            <div class="mt-1 min-h-[180px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 whitespace-pre-wrap break-words text-slate-800">
              {{ selectedIssueDetailRow.detail || '-' }}
            </div>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <Button class="h-10 px-4 text-sm" variant="outline" :disabled="deletingIssueEntry" @click="closeIssueDetailDialog">닫기</Button>
          <Button class="h-10 px-4 text-sm" variant="outline" :disabled="deletingIssueEntry" @click="openIssueDialog(selectedIssueDetailRow)">수정</Button>
          <Button class="h-10 px-4 text-sm" :disabled="deletingIssueEntry" @click="deleteIssueEntry(selectedIssueDetailRow.id)">{{ deletingIssueEntry ? '삭제 중...' : '삭제' }}</Button>
        </div>
      </div>
    </div>

    <div v-if="isIssueDialogOpen" class="report-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div class="w-full max-w-4xl rounded-3xl bg-white p-5 shadow-2xl md:p-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[13px] font-extrabold text-slate-900">{{ editingIssueId ? '이슈 수정' : '이슈 입력' }}</p>
          </div>
          <button type="button" class="text-sm font-semibold text-slate-500 hover:text-slate-700" :disabled="savingIssueEntry || deletingIssueEntry" @click="closeIssueDialog">닫기</button>
        </div>
        <div class="mt-5 grid gap-5 md:grid-cols-2">
          <label class="block">
            <p class="mb-2 text-sm font-bold text-slate-700">구분</p>
            <select v-model="issueForm.issueType" class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              <option value="misproduction">오제작</option>
              <option value="shortage">누락분</option>
            </select>
          </label>
          <label class="block">
            <p class="mb-2 text-sm font-bold text-slate-700">담당자</p>
            <select v-model="issueForm.manager" class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              <option v-for="manager in MANAGERS" :key="manager" :value="manager">{{ manager }}</option>
            </select>
          </label>
          <label class="block">
            <p class="mb-2 text-sm font-bold text-slate-700">접수일</p>
            <input v-model="issueForm.reportedAt" type="date" class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" />
          </label>
          <div class="block md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">회사명 검색</p>
            <div class="flex gap-2">
              <Input
                class="flex-1"
                :model-value="issueCompanySearchText"
                placeholder="회사명 또는 현장명 검색"
                @update:model-value="issueCompanySearchText = $event"
                @keydown.enter="searchIssueCompanies"
              />
              <Button class="h-11 px-4 text-sm" variant="outline" @click="searchIssueCompanies">검색</Button>
            </div>
          </div>
          <div class="block md:col-span-2">
            <div class="max-h-[180px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div v-if="issueCompanySearchLoading" class="py-6 text-center text-sm text-slate-500">검색 중...</div>
              <div v-else-if="issueCompanySearchResults.length === 0" class="py-6 text-center text-sm text-slate-500">검색 결과가 없습니다.</div>
              <div v-else class="space-y-2">
                <button
                  v-for="item in issueCompanySearchResults"
                  :key="item.id"
                  type="button"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 hover:bg-slate-50"
                  @click="selectIssueCompany(item)"
                >
                  <p class="text-sm font-extrabold text-slate-900">{{ item.company || '-' }}</p>
                  <p class="mt-1 text-sm text-slate-600">{{ item.place || '-' }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ item.fullName || '-' }}</p>
                </button>
              </div>
            </div>
          </div>
          <div class="grid gap-5 md:col-span-2 md:grid-cols-3">
            <label class="block">
              <p class="mb-2 text-sm font-bold text-slate-700">회사명</p>
              <Input :model-value="issueForm.company" readonly placeholder="검색 후 선택" />
            </label>
            <label class="block">
              <p class="mb-2 text-sm font-bold text-slate-700">현장명</p>
              <Input :model-value="issueForm.place" readonly placeholder="검색 후 선택" />
            </label>
            <label class="block">
              <p class="mb-2 text-sm font-bold text-slate-700">구역</p>
              <input v-model="issueForm.area" type="text" class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" placeholder="구역을 입력해주세요" />
            </label>
          </div>
          <div class="grid gap-5 md:col-span-2 md:grid-cols-2">
            <label class="block">
              <p class="mb-2 text-sm font-bold text-slate-700">헤드수</p>
              <div class="flex items-center gap-2">
                <input
                  :value="issueForm.headCount"
                  type="text"
                  inputmode="numeric"
                  class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  placeholder="0"
                  @input="issueForm.headCount = sanitizeCountInput($event.target.value)"
                />
                <span class="shrink-0 text-xs font-semibold text-slate-500">개</span>
              </div>
            </label>
            <label class="block">
              <p class="mb-2 text-sm font-bold text-slate-700">전실/입상</p>
              <div class="flex items-center gap-2">
                <input
                  :value="issueForm.installCount"
                  type="text"
                  inputmode="numeric"
                  class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  placeholder="0"
                  @input="issueForm.installCount = sanitizeCountInput($event.target.value)"
                />
                <span class="shrink-0 text-xs font-semibold text-slate-500">개</span>
              </div>
            </label>
          </div>
          <label class="block md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">{{ issueTypeLabelMap[issueForm.issueType] || '이슈' }} 내용</p>
            <textarea v-model="issueForm.detail" rows="4" class="min-h-[112px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" placeholder="상세 내용을 입력해주세요" />
          </label>
        </div>
        <p v-if="issueEntryError" class="mt-4 text-sm font-bold text-red-600">{{ issueEntryError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <Button v-if="editingIssueId" class="h-10 px-4 text-sm" variant="outline" :disabled="savingIssueEntry || deletingIssueEntry" @click="deleteIssueEntry(editingIssueId)">{{ deletingIssueEntry ? '삭제 중...' : '삭제' }}</Button>
          <Button class="h-10 px-4 text-sm" variant="outline" :disabled="savingIssueEntry || deletingIssueEntry" @click="closeIssueDialog">닫기</Button>
          <Button class="h-10 px-4 text-sm" :disabled="savingIssueEntry || deletingIssueEntry" @click="saveIssueEntry">{{ savingIssueEntry ? '저장 중...' : editingIssueId ? '수정' : '저장' }}</Button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.report-print-title {
  display: none;
}

@media print {
  @page {
    size: A4 landscape;
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
