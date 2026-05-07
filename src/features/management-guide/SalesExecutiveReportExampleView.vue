<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import { normalizeCompanyType } from '@/constants/companyTypes'
import { useDialog } from '@/composables/useDialog'
import ReportPrintSettingsDialog from './ReportPrintSettingsDialog.vue'
import { printManagementReport } from './reportPrint'

const { confirm, alert } = useDialog()

const COMPANY_LIST_TABLE = 'company_list'
const SALES_WEEKLY_TABLE = 'sales_weekly_entries'
const SALES_AS_TABLE = 'sales_as_entries'
const WEEK_COUNT = 5
const MONTHLY_TARGET = 600000000
const SALES_CATEGORY_TABS = [
  { key: 'head', label: '헤드', field: 'salesAmountHead', dbField: 'sales_amount_head' },
  { key: 'screw', label: '나사', field: 'salesAmountScrew', dbField: 'sales_amount_screw' },
  { key: 'supipe', label: 'STS/SU', field: 'salesAmountSupipe', dbField: 'sales_amount_supipe' },
]
const SALES_REPORT_BASELINE_START = '2026-01-01'
const emit = defineEmits(['go-back'])
const props = defineProps({
  showBackButton: { type: Boolean, default: true },
})

const route = useRoute()
const router = useRouter()
const currentPage = ref(1)
const loading = ref(false)
const errorMessage = ref('')
const weeklySalesError = ref('')
const asEntriesError = ref('')
const savingWeeklySales = ref(false)
const deletingWeeklySales = ref(false)
const savingAsEntry = ref(false)
const deletingAsEntry = ref(false)
const isSalesDialogOpen = ref(false)
const isPrintSettingsOpen = ref(false)
const activeSalesTab = ref('head')
const isAsDialogOpen = ref(false)
const selectedSalesMonth = ref(new Date())
const isPrinting = ref(false)
const editingAsId = ref(null)

const companyRows = ref([])
const weeklySalesRows = ref([])
const yearlySalesRows = ref([])
const asRows = ref([])
const weeklySalesInputs = ref([])
const asCompanySearchText = ref('')
const asCompanySearchLoading = ref(false)
const asCompanySearchResults = ref([])
const asImageFiles = ref([])
const asImagePreviewUrls = ref([])
const asExistingImageUrls = ref([])
const asForm = ref({
  companyListId: null,
  company: '',
  place: '',
  reportedAt: '',
  issue: '',
  cost: '',
})

const now = new Date()
const reportYear = now.getFullYear()
const reportMonth = now.getMonth()
const reportMonthLabel = `${reportMonth + 1}월`
const reportMonthValue = `${reportYear}-${String(reportMonth + 1).padStart(2, '0')}-01`
const reportYearStartValue = `${reportYear}-01-01`

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
const normalizeText = (value) => String(value ?? '').trim()
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`
const formatPercent = (value) => `${Number(value || 0).toLocaleString('ko-KR')}%`
const formatHead = (value) => `${Number(value || 0).toLocaleString('ko-KR')}헤드`
const formatCompactSales = (value) => {
  const amount = toNumber(value)
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`
  if (amount >= 10000) return `${Math.round(amount / 10000).toLocaleString('ko-KR')}만`
  return amount.toLocaleString('ko-KR')
}
const formatMonthValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
const formatMonthTitle = (date) => `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월`
const sanitizeMoneyInput = (value) => String(value ?? '').replace(/[^\d]/g, '')
const getWeekLabel = (weekIndex) => ['첫째주', '둘째주', '셋째주', '넷째주', '다섯째주'][weekIndex - 1] ?? `${weekIndex}주차`
const isCurrentMonthRow = (row) => String(row?.registration_month ?? '').slice(0, 7) === reportMonthValue.slice(0, 7)
const isSalesBaselineRow = (row) => {
  const raw = String(row?.registration_month ?? '').trim()
  return Boolean(raw) && raw >= SALES_REPORT_BASELINE_START
}
const getNormalizedCompanyType = (row) => normalizeCompanyType(row?.company_type)
const isNonApartment = (row) => getNormalizedCompanyType(row) !== '' && getNormalizedCompanyType(row) !== '아파트'
const formatRegistrationMonth = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})/)
  return matched ? `${matched[2]}월` : raw || '-'
}
const formatShortDate = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return matched ? `${matched[2]}월 ${matched[3]}일` : raw || '-'
}
const formatSiteStatus = (row) => (Boolean(row?.site_completed) ? '종료' : '진행중')
const getFirstImageUrl = (row) => (Array.isArray(row?.image_urls) && row.image_urls.length > 0 ? row.image_urls[0] : '')

const buildWeeklyInputs = (rows) =>
  Array.from({ length: WEEK_COUNT }, (_, index) => {
    const weekIndex = index + 1
    const matched = rows.find((row) => Number(row?.week_index) === weekIndex)
    return {
      weekIndex,
      salesAmountHead: matched ? String(toNumber(matched.sales_amount_head)) : '',
      salesAmountScrew: matched ? String(toNumber(matched.sales_amount_screw)) : '',
      salesAmountSupipe: matched ? String(toNumber(matched.sales_amount_supipe)) : '',
    }
  })

const fetchWeeklySalesByMonth = async (monthValue) => {
  const { data, error } = await supabase
    .from(SALES_WEEKLY_TABLE)
    .select('id,target_month,week_index,sales_amount,sales_amount_head,sales_amount_screw,sales_amount_supipe')
    .eq('target_month', monthValue)
    .order('week_index', { ascending: true })

  return {
    data: data ?? [],
    error,
  }
}

const revokeAsPreviewUrls = () => {
  for (const url of asImagePreviewUrls.value) URL.revokeObjectURL(url)
  asImagePreviewUrls.value = []
}

const resetAsForm = () => {
  editingAsId.value = null
  asForm.value = { companyListId: null, company: '', place: '', reportedAt: '', issue: '', cost: '' }
  asCompanySearchText.value = ''
  asCompanySearchResults.value = []
  asImageFiles.value = []
  asExistingImageUrls.value = []
  revokeAsPreviewUrls()
}

const fetchReportData = async () => {
  loading.value = true
  errorMessage.value = ''

  const [companyResult, weeklyResult, yearlyResult, asResult] = await Promise.all([
    supabase.from(COMPANY_LIST_TABLE).select('id,company,place,company_type,registration_month,total_head_count,total_screw_count,total_supipe_count,order_confirmed,site_completed').order('id', { ascending: false }),
    fetchWeeklySalesByMonth(reportMonthValue),
    supabase
      .from(SALES_WEEKLY_TABLE)
      .select('id,target_month,week_index,sales_amount,sales_amount_head,sales_amount_screw,sales_amount_supipe')
      .gte('target_month', reportYearStartValue)
      .lte('target_month', reportMonthValue)
      .order('target_month', { ascending: true })
      .order('week_index', { ascending: true }),
    supabase.from(SALES_AS_TABLE).select('id,target_month,reported_at,company_list_id,company,place,issue,cost,image_urls').eq('target_month', reportMonthValue).order('reported_at', { ascending: false }),
  ])

  if (companyResult.error || weeklyResult.error || yearlyResult.error || asResult.error) {
    errorMessage.value = companyResult.error?.message ?? weeklyResult.error?.message ?? yearlyResult.error?.message ?? asResult.error?.message ?? '영업부 데이터를 불러오지 못했습니다.'
    companyRows.value = companyResult.data ?? []
    weeklySalesRows.value = weeklyResult.data ?? []
    yearlySalesRows.value = yearlyResult.data ?? []
    asRows.value = asResult.data ?? []
    weeklySalesInputs.value = buildWeeklyInputs(weeklySalesRows.value)
    loading.value = false
    return
  }

  companyRows.value = companyResult.data ?? []
  weeklySalesRows.value = weeklyResult.data ?? []
  yearlySalesRows.value = yearlyResult.data ?? []
  asRows.value = asResult.data ?? []
  weeklySalesInputs.value = buildWeeklyInputs(weeklySalesRows.value)
  loading.value = false
}

const searchAsCompanies = async () => {
  const term = normalizeText(asCompanySearchText.value)
  if (!term) {
    asCompanySearchResults.value = []
    return
  }

  asCompanySearchLoading.value = true
  const { data, error } = await supabase.from(COMPANY_LIST_TABLE).select('id,company,place,full_name').ilike('full_name', `%${term}%`).order('full_name', { ascending: true }).limit(20)
  asCompanySearchLoading.value = false

  if (error) {
    asEntriesError.value = error.message ?? '회사 검색에 실패했습니다.'
    return
  }

  asCompanySearchResults.value = (data ?? []).map((item) => ({
    id: item.id,
    company: String(item.company ?? '').trim(),
    place: String(item.place ?? '').trim(),
    fullName: String(item.full_name ?? '').trim(),
  }))
}

const selectAsCompany = (item) => {
  asForm.value.companyListId = item.id
  asForm.value.company = item.company
  asForm.value.place = item.place
  asCompanySearchText.value = item.fullName || `${item.company} ${item.place}`.trim()
  asCompanySearchResults.value = []
}

const handleAsImageChange = (event) => {
  const files = Array.from(event.target?.files ?? []).filter((file) => String(file.type ?? '').startsWith('image/'))
  revokeAsPreviewUrls()
  asImageFiles.value = files
  asImagePreviewUrls.value = files.map((file) => URL.createObjectURL(file))
}

const uploadAsImages = async () => {
  if (!asImageFiles.value.length) return []

  const uploadedUrls = []
  for (const [index, file] of asImageFiles.value.entries()) {
    const safeName = file.name.replace(/[^\w.\-]/g, '_')
    const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}_${index}`
    const storagePath = `sales/as/${reportMonthValue}/${randomId}_${safeName}`
    const { error } = await supabase.storage.from('media').upload(storagePath, file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('media').getPublicUrl(storagePath)
    uploadedUrls.push(String(data?.publicUrl ?? '').trim())
  }
  return uploadedUrls
}

const saveWeeklySales = async () => {
  weeklySalesError.value = ''
  savingWeeklySales.value = true
  const { data: sessionData } = await supabase.auth.getSession()
  const createdBy = sessionData.session?.user?.id ?? null
  const monthValue = salesDialogMonthValue.value
  const payload = weeklySalesInputs.value.map((row) => {
    const head = toNumber(row.salesAmountHead)
    const screw = toNumber(row.salesAmountScrew)
    const supipe = toNumber(row.salesAmountSupipe)
    return {
      target_month: monthValue,
      week_index: row.weekIndex,
      sales_amount: head + screw + supipe,
      sales_amount_head: head,
      sales_amount_screw: screw,
      sales_amount_supipe: supipe,
      created_by: createdBy,
    }
  })
  const { error } = await supabase.from(SALES_WEEKLY_TABLE).upsert(payload, { onConflict: 'target_month,week_index' })
  savingWeeklySales.value = false

  if (error) {
    weeklySalesError.value = error.message ?? '매출 저장에 실패했습니다.'
    return
  }

  if (salesDialogMonthValue.value === reportMonthValue) {
    weeklySalesRows.value = payload
  }

  if (selectedSalesMonth.value.getFullYear() === reportYear) {
    yearlySalesRows.value = [
      ...yearlySalesRows.value.filter((row) => String(row?.target_month ?? '') !== monthValue),
      ...payload,
    ].sort((a, b) => String(a?.target_month ?? '').localeCompare(String(b?.target_month ?? '')) || toNumber(a?.week_index) - toNumber(b?.week_index))
  }

  weeklySalesInputs.value = buildWeeklyInputs(payload)
  isSalesDialogOpen.value = false
}

const deleteWeeklySales = async () => {
  weeklySalesError.value = ''
  if (!await confirm(`${salesDialogMonthLabel.value} 매출 데이터를 삭제할까요?`)) return
  deletingWeeklySales.value = true

  const monthValue = salesDialogMonthValue.value
  const { error } = await supabase.from(SALES_WEEKLY_TABLE).delete().eq('target_month', monthValue)

  deletingWeeklySales.value = false

  if (error) {
    weeklySalesError.value = error.message ?? '매출 삭제에 실패했습니다.'
    return
  }

  if (monthValue === reportMonthValue) {
    weeklySalesRows.value = []
  }

  if (selectedSalesMonth.value.getFullYear() === reportYear) {
    yearlySalesRows.value = yearlySalesRows.value.filter((row) => String(row?.target_month ?? '') !== monthValue)
  }

  weeklySalesInputs.value = buildWeeklyInputs([])
}

const saveAsEntry = async () => {
  asEntriesError.value = ''
  savingAsEntry.value = true

  const payload = {
    reported_at: String(asForm.value.reportedAt ?? '').trim() || null,
    company_list_id: asForm.value.companyListId || null,
    company: normalizeText(asForm.value.company),
    place: normalizeText(asForm.value.place),
    issue: normalizeText(asForm.value.issue),
    cost: toNumber(String(asForm.value.cost ?? '').replace(/[^\d]/g, '')),
  }

  if (!payload.company_list_id || !payload.company || !payload.place) {
    savingAsEntry.value = false
    asEntriesError.value = '회사명 검색 후 회사/현장을 선택해주세요.'
    return
  }
  if (!payload.reported_at) {
    savingAsEntry.value = false
    asEntriesError.value = '접수일을 입력해주세요.'
    return
  }
  if (!payload.issue) {
    savingAsEntry.value = false
    asEntriesError.value = 'AS 내용을 입력해주세요.'
    return
  }

  try {
    const uploadedImageUrls = await uploadAsImages()
    const imageUrls = editingAsId.value ? [...asExistingImageUrls.value, ...uploadedImageUrls] : uploadedImageUrls
    const { data: sessionData } = await supabase.auth.getSession()
    const createdBy = sessionData.session?.user?.id ?? null
    const query = editingAsId.value
      ? supabase
          .from(SALES_AS_TABLE)
          .update({ ...payload, image_urls: imageUrls })
          .eq('id', editingAsId.value)
      : supabase.from(SALES_AS_TABLE).insert({ ...payload, target_month: reportMonthValue, created_by: createdBy, image_urls: imageUrls })
    const { data, error } = await query.select('id,target_month,reported_at,company_list_id,company,place,issue,cost,image_urls').single()
    savingAsEntry.value = false

    if (error) {
      asEntriesError.value = error.message ?? 'AS 저장에 실패했습니다.'
      return
    }

    asRows.value = [...asRows.value.filter((row) => row.id !== data.id), data].sort((a, b) => String(b.reported_at ?? '').localeCompare(String(a.reported_at ?? '')))
    resetAsForm()
    isAsDialogOpen.value = false
  } catch (error) {
    savingAsEntry.value = false
    asEntriesError.value = error?.message ?? '이미지 업로드 또는 저장에 실패했습니다.'
  }
}

const deleteAsEntry = async (rowId) => {
  asEntriesError.value = ''
  const targetRow = asRows.value.find((row) => row.id === rowId)
  if (!await confirm(`${targetRow?.company || '선택한'} AS 데이터를 삭제할까요?`)) return
  deletingAsEntry.value = true

  const { error } = await supabase.from(SALES_AS_TABLE).delete().eq('id', rowId)

  deletingAsEntry.value = false

  if (error) {
    asEntriesError.value = error.message ?? 'AS 삭제에 실패했습니다.'
    return
  }

  asRows.value = asRows.value.filter((row) => row.id !== rowId)
  if (editingAsId.value === rowId) {
    resetAsForm()
    isAsDialogOpen.value = false
  }
}

const currentMonthRows = computed(() => companyRows.value.filter((row) => isCurrentMonthRow(row)))
const salesBaselineRows = computed(() => companyRows.value.filter((row) => isSalesBaselineRow(row)))
const confirmedRows = computed(() => currentMonthRows.value.filter((row) => Boolean(row?.order_confirmed)))
const expectedRows = computed(() => salesBaselineRows.value.filter((row) => !Boolean(row?.order_confirmed)))
const weeklySalesTotal = computed(() => weeklySalesRows.value.reduce((sum, row) => sum + toNumber(row.sales_amount), 0))
const salesProgress = computed(() => (!MONTHLY_TARGET ? 0 : Math.round((weeklySalesTotal.value / MONTHLY_TARGET) * 100)))
const salesProgressWidth = computed(() => Math.min(100, Math.max(0, salesProgress.value)))
const currentSalesWeekRow = computed(() =>
  [...weeklySalesRows.value]
    .sort((a, b) => toNumber(b?.week_index) - toNumber(a?.week_index))
    .find((row) => toNumber(row?.sales_amount) > 0) ?? null,
)
const currentSalesWeekIndex = computed(() => toNumber(currentSalesWeekRow.value?.week_index) || 1)
const currentSalesWeekLabel = computed(() => `${reportMonthLabel} ${currentSalesWeekIndex.value}주차`)
const currentSalesWeekAmount = computed(() => toNumber(currentSalesWeekRow.value?.sales_amount))
const confirmedHeadTotal = computed(() => confirmedRows.value.reduce((sum, row) => sum + toNumber(row?.total_head_count), 0))
const expectedHeadTotal = computed(() => expectedRows.value.reduce((sum, row) => sum + toNumber(row?.total_head_count), 0))
const confirmedScrewTotal = computed(() => confirmedRows.value.reduce((sum, row) => sum + toNumber(row?.total_screw_count), 0))
const confirmedSupipeTotal = computed(() => confirmedRows.value.reduce((sum, row) => sum + toNumber(row?.total_supipe_count), 0))
const expectedScrewTotal = computed(() => expectedRows.value.reduce((sum, row) => sum + toNumber(row?.total_screw_count), 0))
const expectedSupipeTotal = computed(() => expectedRows.value.reduce((sum, row) => sum + toNumber(row?.total_supipe_count), 0))
const formatPieces = (value) => `${Number(value || 0).toLocaleString('ko-KR')}개`
const yearlyMonthlySales = computed(() =>
  Array.from({ length: reportMonth + 1 }, (_, index) => {
    const month = index + 1
    const monthValue = `${reportYear}-${String(month).padStart(2, '0')}-01`
    const rows = yearlySalesRows.value.filter((row) => String(row?.target_month ?? '') === monthValue)
    const head = rows.reduce((sum, row) => sum + toNumber(row?.sales_amount_head), 0)
    const screw = rows.reduce((sum, row) => sum + toNumber(row?.sales_amount_screw), 0)
    const supipe = rows.reduce((sum, row) => sum + toNumber(row?.sales_amount_supipe), 0)

    return {
      label: `${month}월`,
      value: head + screw + supipe,
      head,
      screw,
      supipe,
    }
  }),
)
const yearlySalesMax = computed(() => Math.max(...yearlyMonthlySales.value.map((item) => item.value), 0))
const yearlyBarUnitHeight = (value) => (yearlySalesMax.value ? (value / yearlySalesMax.value) * 160 : 0)
const nonApartmentRatio = computed(() => {
  const total = salesBaselineRows.value.length
  if (!total) return 0
  return Math.round((salesBaselineRows.value.filter((row) => isNonApartment(row)).length / total) * 100)
})
const buildingTypeToneClasses = [
  'border-emerald-200 bg-emerald-50 text-emerald-700',
  'border-sky-200 bg-sky-50 text-sky-700',
  'border-violet-200 bg-violet-50 text-violet-700',
  'border-amber-200 bg-amber-50 text-amber-700',
]
const buildingTypeSummaryItems = computed(() => {
  const typedRows = salesBaselineRows.value.filter((row) => Boolean(getNormalizedCompanyType(row)))
  const total = typedRows.length
  if (!total) return []

  const counts = new Map()
  for (const row of typedRows) {
    const type = getNormalizedCompanyType(row)
    if (!type) continue
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .slice(0, 4)
    .map(([label, count], index) => ({
      label,
      ratioText: formatPercent(Math.round((count / total) * 100)),
      tone: buildingTypeToneClasses[index % buildingTypeToneClasses.length],
    }))
})
const targetSummary = computed(() => ({
  monthlyTarget: formatCurrency(MONTHLY_TARGET),
  achievementRate: formatPercent(salesProgress.value),
  nonApartmentRatio: formatPercent(nonApartmentRatio.value),
  confirmedHead: formatHead(confirmedHeadTotal.value),
  expectedHead: formatHead(expectedHeadTotal.value),
}))
const asTotalCost = computed(() => asRows.value.reduce((sum, row) => sum + toNumber(row?.cost), 0))
const confirmedCombinedTotal = computed(() => confirmedHeadTotal.value + confirmedScrewTotal.value + confirmedSupipeTotal.value)
const expectedCombinedTotal = computed(() => expectedHeadTotal.value + expectedScrewTotal.value + expectedSupipeTotal.value)
const summaryCards = computed(() => [
  { label: '신규 수주', value: formatPieces(confirmedCombinedTotal.value), note: `헤드 ${formatPieces(confirmedHeadTotal.value)} · 나사 ${formatPieces(confirmedScrewTotal.value)} · STS/SU ${formatPieces(confirmedSupipeTotal.value)}`, tone: 'bg-emerald-50 border-emerald-200 text-emerald-800', clickable: false },
  { label: '신규 수주 예정', value: formatPieces(expectedCombinedTotal.value), note: `헤드 ${formatPieces(expectedHeadTotal.value)} · 나사 ${formatPieces(expectedScrewTotal.value)} · STS/SU ${formatPieces(expectedSupipeTotal.value)}`, tone: 'bg-indigo-50 border-indigo-200 text-indigo-800', clickable: false },
  { label: 'AS 발생 건수', value: `${asRows.value.length}건`, note: `${reportMonthLabel} 접수 누계`, tone: 'bg-rose-50 border-rose-200 text-rose-800', clickable: true },
  { label: 'AS 발생 비용', value: formatCurrency(asTotalCost.value), note: `${reportMonthLabel} 접수 비용 합계`, tone: 'bg-amber-50 border-amber-200 text-amber-800', clickable: false },
])
const hasSalesDialogData = computed(() =>
  weeklySalesInputs.value.some(
    (row) =>
      toNumber(row.salesAmountHead) > 0 ||
      toNumber(row.salesAmountScrew) > 0 ||
      toNumber(row.salesAmountSupipe) > 0,
  ),
)
const weeklySalesBreakdown = computed(() => {
  const head = weeklySalesRows.value.reduce((sum, row) => sum + toNumber(row?.sales_amount_head), 0)
  const screw = weeklySalesRows.value.reduce((sum, row) => sum + toNumber(row?.sales_amount_screw), 0)
  const supipe = weeklySalesRows.value.reduce((sum, row) => sum + toNumber(row?.sales_amount_supipe), 0)
  return { head, screw, supipe, total: head + screw + supipe }
})
const currentSalesWeekBreakdown = computed(() => {
  const row = currentSalesWeekRow.value
  const head = toNumber(row?.sales_amount_head)
  const screw = toNumber(row?.sales_amount_screw)
  const supipe = toNumber(row?.sales_amount_supipe)
  return { head, screw, supipe, total: head + screw + supipe }
})

const openSalesDialog = () => {
  weeklySalesError.value = ''
  selectedSalesMonth.value = new Date(reportYear, reportMonth, 1)
  weeklySalesInputs.value = buildWeeklyInputs(weeklySalesRows.value)
  activeSalesTab.value = 'head'
  isSalesDialogOpen.value = true
}
const openPrintSettings = () => {
  if (typeof window !== 'undefined' && window.electronAPI?.printReport) {
    isPrintSettingsOpen.value = true
    return
  }
  printReport()
}
const printReport = async (options = {}) => {
  isPrintSettingsOpen.value = false
  await printManagementReport(isPrinting, options)
}
const closeSalesDialog = () => {
  if (savingWeeklySales.value || deletingWeeklySales.value) return
  isSalesDialogOpen.value = false
}
const salesDialogMonthValue = computed(() => formatMonthValue(selectedSalesMonth.value))
const salesDialogMonthLabel = computed(() => formatMonthTitle(selectedSalesMonth.value))
const isCurrentSalesDialogMonth = computed(() => salesDialogMonthValue.value === reportMonthValue)
const loadSalesDialogMonth = async () => {
  weeklySalesError.value = ''
  const { data, error } = await fetchWeeklySalesByMonth(salesDialogMonthValue.value)

  if (error) {
    weeklySalesError.value = error.message ?? '매출 데이터를 불러오지 못했습니다.'
    weeklySalesInputs.value = buildWeeklyInputs([])
    return
  }

  weeklySalesInputs.value = buildWeeklyInputs(data)
}
const moveSalesDialogMonth = async (delta) => {
  selectedSalesMonth.value = new Date(selectedSalesMonth.value.getFullYear(), selectedSalesMonth.value.getMonth() + delta, 1)
  await loadSalesDialogMonth()
}
const resetSalesDialogMonthToCurrent = async () => {
  selectedSalesMonth.value = new Date(reportYear, reportMonth, 1)
  await loadSalesDialogMonth()
}
const openAsDialog = (row = null) => {
  asEntriesError.value = ''
  resetAsForm()
  if (row) {
    editingAsId.value = row.id
    asForm.value = {
      companyListId: row.company_list_id ?? null,
      company: row.company ?? '',
      place: row.place ?? '',
      reportedAt: row.reported_at ?? '',
      issue: row.issue ?? '',
      cost: row.cost != null ? String(toNumber(row.cost)) : '',
    }
    asCompanySearchText.value = `${row.company ?? ''} ${row.place ?? ''}`.trim()
    asExistingImageUrls.value = Array.isArray(row.image_urls) ? [...row.image_urls] : []
  }
  isAsDialogOpen.value = true
}
const closeAsDialog = () => {
  if (savingAsEntry.value || deletingAsEntry.value) return
  resetAsForm()
  isAsDialogOpen.value = false
}
const setPage = (page) => {
  currentPage.value = page

  if (route.name !== 'sales-report') return

  const nextQuery = { ...route.query }
  if (page === 2) nextQuery.page = '2'
  else delete nextQuery.page
  router.replace({ name: 'sales-report', query: nextQuery })
}

const goAsListPage = () => {
  setPage(2)
}
const goAsDetailPage = (rowId) => router.push({ name: 'sales-as-detail', params: { id: rowId } })

watch(
  () => route.query.page,
  (page) => {
    currentPage.value = page === '2' ? 2 : 1
  },
  { immediate: true },
)

onMounted(fetchReportData)
onBeforeUnmount(revokeAsPreviewUrls)
</script>

<template>
  <section class="report-root min-h-screen bg-slate-100">
    <header class="report-header sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-[11px] font-bold tracking-[0.12em] text-slate-500">영업부 보고자료</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900 md:text-xl">영업부 대표 보고</h1>
          <p class="mt-2 text-[13px] text-slate-600">매출, 수주, AS 현황을 정리한 화면입니다.</p>
        </div>
        <div class="flex shrink-0 gap-2">
          <Button class="shrink-0" variant="outline" @click="openPrintSettings">인쇄</Button>
          <Button v-if="props.showBackButton" class="shrink-0" variant="outline" @click="emit('go-back')">가이드로 돌아가기</Button>
        </div>
      </div>
      <div class="mx-auto flex max-w-7xl gap-1 px-4 pb-3 md:px-6">
        <button type="button" class="rounded-xl px-4 py-2.5 text-[13px] font-bold transition" :class="currentPage === 1 ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'" @click="setPage(1)">1페이지 · 요약본</button>
        <button type="button" class="rounded-xl px-4 py-2.5 text-[13px] font-bold transition" :class="currentPage === 2 ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'" @click="setPage(2)">2페이지 · 디테일</button>
        <button type="button" class="rounded-xl bg-slate-100 px-4 py-2.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200" @click="openSalesDialog">매출입력</button>
        <button type="button" class="rounded-xl bg-slate-100 px-4 py-2.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200" @click="openAsDialog">AS 발생 입력</button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500 shadow-sm">영업부 데이터를 불러오는 중입니다.</div>
      <div v-else-if="errorMessage" class="rounded-3xl border border-red-200 bg-red-50 px-4 py-16 text-center text-sm font-semibold text-red-600 shadow-sm">{{ errorMessage }}</div>
      <template v-else>
        <div v-show="currentPage === 1 || isPrinting" class="report-page report-page-break space-y-6">
          <div class="report-print-title">영업부 대표 보고 · 1페이지 요약본</div>
          <section class="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-indigo-50 p-6 shadow-sm">
            <div class="flex flex-col gap-4 md:flex-row md:items-stretch md:justify-between">
              <div class="flex-1">
                <p class="text-[12px] font-bold text-emerald-700">{{ reportMonthLabel }} 영업 핵심 지표</p>
                <h2 class="mt-2 text-2xl font-extrabold text-slate-900">{{ reportMonthLabel }} 영업 실적 요약</h2>
                <div class="mt-4 space-y-2 text-[12px] font-semibold">
                  <div class="grid gap-2 sm:grid-cols-3">
                    <span class="rounded-full border border-emerald-200 bg-white px-3 py-1 text-center text-slate-700">월 목표 {{ targetSummary.monthlyTarget }}</span>
                    <span class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-center text-sky-700">달성률 {{ targetSummary.achievementRate }}</span>
                    <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-center text-slate-700">비아파트 비중 {{ targetSummary.nonApartmentRatio }}</span>
                  </div>
                  <div v-if="buildingTypeSummaryItems.length" class="flex flex-wrap gap-2">
                    <span
                      v-for="item in buildingTypeSummaryItems"
                      :key="item.label"
                      class="rounded-full border px-3 py-1 text-center"
                      :class="item.tone"
                    >
                      {{ item.label }} {{ item.ratioText }}
                    </span>
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <div class="rounded-2xl border-2 border-emerald-300 bg-white px-3 py-3 text-center shadow-sm">
                      <p class="text-[12px] font-bold text-emerald-700">신규수주 헤드</p>
                      <p class="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl">{{ formatPieces(confirmedHeadTotal) }}</p>
                    </div>
                    <div class="rounded-2xl border-2 border-sky-300 bg-white px-3 py-3 text-center shadow-sm">
                      <p class="text-[12px] font-bold text-sky-700">신규수주 나사</p>
                      <p class="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl">{{ formatPieces(confirmedScrewTotal) }}</p>
                    </div>
                    <div class="rounded-2xl border-2 border-amber-300 bg-white px-3 py-3 text-center shadow-sm">
                      <p class="text-[12px] font-bold text-amber-700">신규수주 STS/SU</p>
                      <p class="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl">{{ formatPieces(confirmedSupipeTotal) }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm md:w-[380px] lg:w-[420px] md:self-stretch">
                <p class="text-[12px] font-bold text-emerald-700">매출 진행률 {{ currentSalesWeekLabel }} · 헤드+나사+STS/SU 합산</p>
                <p class="mt-2 text-3xl font-extrabold text-slate-900">{{ formatCurrency(currentSalesWeekBreakdown.total) }}</p>
                <p class="mt-1 text-[11px] font-semibold text-slate-500">
                  헤드 {{ formatCompactSales(currentSalesWeekBreakdown.head) }}
                  · 나사 {{ formatCompactSales(currentSalesWeekBreakdown.screw) }}
                  · STS/SU {{ formatCompactSales(currentSalesWeekBreakdown.supipe) }}
                </p>
                <div class="mt-4 w-full text-left">
                  <div class="mb-2 flex items-center justify-between text-[12px] font-semibold text-slate-700"><span>월 누적 매출</span><span>{{ formatCurrency(weeklySalesBreakdown.total) }}</span></div>
                  <div class="h-4 rounded-full bg-slate-200"><div class="h-4 rounded-full bg-emerald-500" :style="{ width: `${salesProgressWidth}%` }" /></div>
                  <div class="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>현재 {{ formatCurrency(weeklySalesBreakdown.total) }}</span><span>목표 {{ targetSummary.monthlyTarget }}</span></div>
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-white p-2">
            <div class="sales-print-grid-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <button v-for="card in summaryCards" :key="card.label" type="button" class="rounded-2xl border p-4 text-left" :class="[card.tone, card.clickable ? 'cursor-pointer transition hover:shadow-sm' : 'cursor-default']" @click="card.clickable ? goAsListPage() : null">
                <p class="text-[13px] font-bold">{{ card.label }}</p>
                <p class="mt-2 text-2xl font-extrabold">{{ card.value }}</p>
                <p class="mt-1 text-[11px] font-semibold opacity-80">{{ card.note }}</p>
              </button>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[13px] font-extrabold text-slate-900">{{ reportYear }}년 월별 매출</p>
                <p class="mt-1 text-[12px] text-slate-500">1월부터 {{ reportMonthLabel }}까지 입력된 매출입니다.</p>
              </div>
            </div>

            <div class="mt-6">
              <div class="mb-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
                <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-500" />헤드</span>
                <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-sky-500" />나사</span>
                <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-amber-500" />STS/SU</span>
              </div>
              <div class="flex h-[240px] items-end gap-3 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div
                  v-for="item in yearlyMonthlySales"
                  :key="item.label"
                  class="flex min-w-[56px] flex-1 flex-col items-center justify-end"
                >
                  <p class="mb-2 text-[11px] font-semibold text-slate-500">{{ formatCompactSales(item.value) }}</p>
                  <div class="flex h-[160px] items-end">
                    <div class="flex w-10 flex-col-reverse overflow-hidden rounded-t-xl">
                      <div class="w-full bg-emerald-500" :style="{ height: `${yearlyBarUnitHeight(item.head)}px` }" />
                      <div class="w-full bg-sky-500" :style="{ height: `${yearlyBarUnitHeight(item.screw)}px` }" />
                      <div class="w-full bg-amber-500" :style="{ height: `${yearlyBarUnitHeight(item.supipe)}px` }" />
                    </div>
                  </div>
                  <p class="mt-3 text-[12px] font-bold text-slate-600">{{ item.label }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-show="currentPage === 2 || isPrinting" class="report-page space-y-6">
          <div class="report-print-title">영업부 대표 보고 · 2페이지 디테일</div>
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[13px] font-extrabold text-slate-900">신규 수주 목록</p>
                <p class="mt-1 text-[12px] text-slate-500">{{ reportMonthLabel }} 계약 완료 기준</p>
              </div>
              <span class="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">{{ confirmedRows.length }}건</span>
            </div>
            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full border-separate border-spacing-0 text-sm">
                <thead><tr class="bg-slate-50 text-slate-600"><th class="border border-slate-200 px-3 py-2 text-center">등록월</th><th class="border border-slate-200 px-3 py-2 text-center">회사</th><th class="border border-slate-200 px-3 py-2 text-center">현장</th><th class="border border-slate-200 px-3 py-2 text-center">헤드수</th><th class="border border-slate-200 px-3 py-2 text-center">건물종류</th></tr></thead>
                <tbody>
                  <tr v-if="confirmedRows.length === 0" class="bg-white"><td colspan="5" class="border border-slate-200 px-3 py-8 text-center text-slate-500">이번 달 확정수주가 없습니다.</td></tr>
                  <tr v-for="row in confirmedRows" :key="row.id" class="bg-white"><td class="border border-slate-200 px-3 py-2 text-center">{{ formatRegistrationMonth(row.registration_month) }}</td><td class="border border-slate-200 px-3 py-2 text-center">{{ row.company || '-' }}</td><td class="border border-slate-200 px-3 py-2 text-center">{{ row.place || '-' }}</td><td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ formatHead(row.total_head_count) }}</td><td class="border border-slate-200 px-3 py-2 text-center">{{ getNormalizedCompanyType(row) || '-' }}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[13px] font-extrabold text-slate-900">신규 수주 예정 목록</p>
                <p class="mt-1 text-[12px] text-slate-500">2026년 1월 이후 등록 예정</p>
              </div>
              <span class="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-700">{{ expectedRows.length }}건</span>
            </div>
            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full border-separate border-spacing-0 text-sm">
                <thead><tr class="bg-slate-50 text-slate-600"><th class="border border-slate-200 px-3 py-2 text-center">등록월</th><th class="border border-slate-200 px-3 py-2 text-center">회사</th><th class="border border-slate-200 px-3 py-2 text-center">현장</th><th class="border border-slate-200 px-3 py-2 text-center">예상 헤드수</th><th class="border border-slate-200 px-3 py-2 text-center">건물종류</th></tr></thead>
                <tbody>
                  <tr v-if="expectedRows.length === 0" class="bg-white"><td colspan="5" class="border border-slate-200 px-3 py-8 text-center text-slate-500">2026년 1월 이후 수주예정이 없습니다.</td></tr>
                  <tr v-for="row in expectedRows" :key="row.id" class="bg-white"><td class="border border-slate-200 px-3 py-2 text-center">{{ formatRegistrationMonth(row.registration_month) }}</td><td class="border border-slate-200 px-3 py-2 text-center">{{ row.company || '-' }}</td><td class="border border-slate-200 px-3 py-2 text-center">{{ row.place || '-' }}</td><td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ formatHead(row.total_head_count) }}</td><td class="border border-slate-200 px-3 py-2 text-center">{{ getNormalizedCompanyType(row) || '-' }}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[13px] font-extrabold text-slate-900">AS 발생 목록</p>
                <p class="mt-1 text-[12px] text-slate-500">{{ reportMonthLabel }} 접수 기준</p>
              </div>
              <span class="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700">{{ asRows.length }}건</span>
            </div>

            <div v-if="asRows.length === 0" class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              이번 달 AS가 없습니다.
            </div>

            <div v-else class="mt-4 space-y-3">
              <article
                v-for="row in asRows"
                :key="row.id"
                class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
                @click="goAsDetailPage(row.id)"
              >
                <div class="flex items-start gap-3">
                  <div class="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img v-if="getFirstImageUrl(row)" :src="getFirstImageUrl(row)" alt="AS 대표 이미지" class="h-full w-full object-cover" />
                    <div v-else class="flex h-full items-center justify-center px-2 text-[11px] text-slate-400">이미지 없음</div>
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-extrabold text-slate-900">{{ row.company || '-' }}</p>
                        <p class="mt-0.5 truncate text-[12px] text-slate-600">{{ row.place || '-' }}</p>
                      </div>
                      <div class="shrink-0 text-right">
                        <p class="text-[11px] font-semibold text-slate-500">{{ formatShortDate(row.reported_at) }}</p>
                        <div class="mt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            class="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                            @click.stop="openAsDialog(row)"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            class="text-[11px] font-bold text-rose-500 hover:text-rose-700"
                            :disabled="deletingAsEntry"
                            @click.stop="deleteAsEntry(row.id)"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>

                    <p class="mt-2 line-clamp-2 text-[13px] leading-5 text-slate-700">{{ row.issue || '-' }}</p>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </template>
    </main>

    <div v-if="isSalesDialogOpen" class="report-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div class="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl md:p-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[13px] font-extrabold text-slate-900">매출입력</p>
            <div class="mt-2 flex items-center gap-2">
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" @click="moveSalesDialogMonth(-1)">&lt;</button>
              <p class="min-w-[110px] text-center text-[13px] font-bold text-slate-700">{{ salesDialogMonthLabel }}</p>
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" @click="moveSalesDialogMonth(1)">&gt;</button>
              <button
                type="button"
                class="ml-1 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition"
                :class="isCurrentSalesDialogMonth ? 'border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                :disabled="isCurrentSalesDialogMonth"
                @click="resetSalesDialogMonthToCurrent"
              >
                이번달로
              </button>
            </div>
            <p class="mt-2 text-[12px] text-slate-500">{{ salesDialogMonthLabel }} 첫째주부터 다섯째주까지 직접 입력합니다.</p>
          </div>
          <button type="button" class="text-sm font-semibold text-slate-500 hover:text-slate-700" @click="closeSalesDialog">닫기</button>
        </div>
        <div class="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            v-for="tab in SALES_CATEGORY_TABS"
            :key="tab.key"
            type="button"
            class="flex-1 rounded-lg px-3 py-2 text-[13px] font-bold transition"
            :class="activeSalesTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
            @click="activeSalesTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-600">
                <th class="border border-slate-200 px-3 py-2 text-center">주차</th>
                <th class="border border-slate-200 px-3 py-2 text-center">
                  {{ SALES_CATEGORY_TABS.find((tab) => tab.key === activeSalesTab)?.label }} 매출
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in weeklySalesInputs" :key="row.weekIndex" class="bg-white">
                <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">
                  {{ salesDialogMonthLabel }} {{ getWeekLabel(row.weekIndex) }}
                </td>
                <td class="border border-slate-200 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <input
                      :value="Number(row[SALES_CATEGORY_TABS.find((tab) => tab.key === activeSalesTab)?.field] || 0).toLocaleString('ko-KR')"
                      type="text"
                      inputmode="numeric"
                      class="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      placeholder="0"
                      @input="row[SALES_CATEGORY_TABS.find((tab) => tab.key === activeSalesTab)?.field] = sanitizeMoneyInput($event.target.value)"
                    />
                    <span class="shrink-0 text-xs font-semibold text-slate-500">원</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="mt-3 text-[12px] font-semibold text-slate-500">
            주차별 합계: 헤드 {{ formatCurrency(weeklySalesInputs.reduce((s, r) => s + toNumber(r.salesAmountHead), 0)) }}
            · 나사 {{ formatCurrency(weeklySalesInputs.reduce((s, r) => s + toNumber(r.salesAmountScrew), 0)) }}
            · STS/SU {{ formatCurrency(weeklySalesInputs.reduce((s, r) => s + toNumber(r.salesAmountSupipe), 0)) }}
          </p>
        </div>
        <p v-if="weeklySalesError" class="mt-4 text-sm font-bold text-red-600">{{ weeklySalesError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <Button
            v-if="hasSalesDialogData"
            class="h-10 px-4 text-sm"
            variant="outline"
            :disabled="savingWeeklySales || deletingWeeklySales"
            @click="deleteWeeklySales"
          >
            {{ deletingWeeklySales ? '삭제 중...' : '삭제' }}
          </Button>
          <Button class="h-10 px-4 text-sm" variant="outline" :disabled="savingWeeklySales || deletingWeeklySales" @click="closeSalesDialog">닫기</Button>
          <Button class="h-10 px-4 text-sm" :disabled="savingWeeklySales || deletingWeeklySales" @click="saveWeeklySales">{{ savingWeeklySales ? '저장 중...' : '저장' }}</Button>
        </div>
      </div>
    </div>

    <div v-if="isAsDialogOpen" class="report-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div class="w-full max-w-4xl rounded-3xl bg-white p-5 shadow-2xl md:p-6">
        <div class="flex items-center justify-between gap-3"><div><p class="text-[13px] font-extrabold text-slate-900">{{ editingAsId ? 'AS 발생 수정' : 'AS 발생 입력' }}</p><p class="mt-1 text-[12px] text-slate-500">회사등록처럼 검색 후 회사/현장을 선택하고, 이미지도 여러 장 첨부할 수 있습니다.</p></div><button type="button" class="text-sm font-semibold text-slate-500 hover:text-slate-700" @click="closeAsDialog">닫기</button></div>
        <div class="mt-5 grid gap-5 md:grid-cols-2">
          <div class="md:col-span-2"><p class="mb-2 text-sm font-bold text-slate-700">회사명 검색</p><div class="flex gap-2"><Input class="flex-1" :model-value="asCompanySearchText" placeholder="회사명 또는 현장명 검색" @update:model-value="asCompanySearchText = $event" @keydown.enter="searchAsCompanies" /><Button class="h-11 px-4 text-sm" variant="outline" @click="searchAsCompanies">검색</Button></div></div>
          <div class="md:col-span-2"><div class="max-h-[180px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3"><div v-if="asCompanySearchLoading" class="py-6 text-center text-sm text-slate-500">검색 중...</div><div v-else-if="asCompanySearchResults.length === 0" class="py-6 text-center text-sm text-slate-500">검색 결과가 없습니다.</div><div v-else class="space-y-2"><button v-for="item in asCompanySearchResults" :key="item.id" type="button" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 hover:bg-slate-50" @click="selectAsCompany(item)"><p class="text-sm font-extrabold text-slate-900">{{ item.company || '-' }}</p><p class="mt-1 text-sm text-slate-600">{{ item.place || '-' }}</p><p class="mt-1 text-xs text-slate-500">{{ item.fullName || '-' }}</p></button></div></div></div>
          <div><p class="mb-2 text-sm font-bold text-slate-700">회사명</p><Input :model-value="asForm.company" readonly placeholder="검색 후 선택" /></div>
          <div><p class="mb-2 text-sm font-bold text-slate-700">현장명</p><Input :model-value="asForm.place" readonly placeholder="검색 후 선택" /></div>
          <div><p class="mb-2 text-sm font-bold text-slate-700">접수일</p><input v-model="asForm.reportedAt" type="date" class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" /></div>
          <div><p class="mb-2 text-sm font-bold text-slate-700">AS 비용</p><input :value="Number(asForm.cost || 0).toLocaleString('ko-KR')" type="text" inputmode="numeric" class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" placeholder="0" @input="asForm.cost = sanitizeMoneyInput($event.target.value)" /></div>
          <div class="md:col-span-2"><p class="mb-2 text-sm font-bold text-slate-700">AS 내용</p><textarea v-model="asForm.issue" class="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" rows="3" placeholder="AS 내용을 입력해주세요" /></div>
          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">이미지 첨부</p>
            <input type="file" accept="image/*" multiple class="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" @change="handleAsImageChange" />
            <p v-if="editingAsId && asExistingImageUrls.length > 0" class="mt-2 text-[12px] text-slate-500">기존 이미지는 유지되고, 새 이미지를 선택하면 추가됩니다.</p>
            <div v-if="asExistingImageUrls.length > 0" class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(url, index) in asExistingImageUrls" :key="`existing-${url}-${index}`" class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img :src="url" alt="AS existing preview" class="h-28 w-full object-cover" />
              </div>
            </div>
            <div v-if="asImagePreviewUrls.length > 0" class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(url, index) in asImagePreviewUrls" :key="`${url}-${index}`" class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img :src="url" alt="AS preview" class="h-28 w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
        <p v-if="asEntriesError" class="mt-4 text-sm font-bold text-red-600">{{ asEntriesError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <Button
            v-if="editingAsId"
            class="h-10 px-4 text-sm"
            variant="outline"
            :disabled="savingAsEntry || deletingAsEntry"
            @click="deleteAsEntry(editingAsId)"
          >
            {{ deletingAsEntry ? '삭제 중...' : '삭제' }}
          </Button>
          <Button class="h-10 px-4 text-sm" variant="outline" :disabled="savingAsEntry || deletingAsEntry" @click="closeAsDialog">닫기</Button>
          <Button class="h-10 px-4 text-sm" :disabled="savingAsEntry || deletingAsEntry" @click="saveAsEntry">{{ savingAsEntry ? '저장 중...' : editingAsId ? '수정' : '저장' }}</Button>
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
  .report-dialog {
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

  .sales-print-grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .sales-print-grid-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }
}
</style>
