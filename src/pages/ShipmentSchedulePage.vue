<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import PrintSettingsDialog from '@/features/printing/PrintSettingsDialog.vue'
import { printCurrentPage } from '@/features/printing/pagePrint'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/lib/supabase'

const SHIPMENT_SCHEDULE_TABLE = 'shipment_schedule'
const COMPANY_LIST_TABLE = 'company_list'
const PRODUCT_LIST_TABLE = 'product_list'
const SCHEDULE_TYPE_OPTIONS = [
  { value: 'day', label: '당착' },
  { value: 'night', label: '야상' },
]
const FLOAT_STATUS_OPTIONS = [
  { value: 'O', label: 'O' },
  { value: 'X', label: 'X' },
]

const normalizeText = (value) => String(value ?? '').trim()
const formatIsoDate = (date = new Date()) => {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const { session } = useAuth()

const rows = ref([])
const pendingRows = ref([])
const companyOptions = ref([])
const managerNameMap = ref({})
const loading = ref(false)
const pendingLoading = ref(false)
const pendingError = ref('')
const loadingCompanyOptions = ref(false)
const saving = ref(false)
const deleting = ref(false)
const errorMessage = ref('')
const saveError = ref('')
const isDialogOpen = ref(false)
const listSearchText = ref('')
const pendingSearchText = ref('')
const currentViewDate = ref(formatIsoDate())
const dateRangeStart = ref('')
const dateRangeEnd = ref('')
const companyPlaceSearchText = ref('')
const companyPlaceResults = ref([])
const activeTab = ref('shipment')
const isPrinting = ref(false)
const isPrintSettingsOpen = ref(false)

const form = reactive({
  id: null,
  company: '',
  place: '',
  area: '',
  shipmentDate: '',
  scheduleType: 'day',
  arrivalTime: '',
  hasPlot: false,
  floatStatus: 'O',
})

const addDays = (value, days) => {
  const base = value ? new Date(value) : new Date()
  if (Number.isNaN(base.getTime())) return formatIsoDate()
  base.setDate(base.getDate() + days)
  return formatIsoDate(base)
}
const formatKoreanDate = (value) => {
  const raw = normalizeText(value)
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return raw || '-'
  const [, year, month, day] = matched
  return `${year}년 ${month}월 ${day}일`
}
const formatShortMonthDay = (value) => {
  const raw = normalizeText(value)
  const matched = raw.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!matched) return raw
  const [, month, day] = matched
  return `${month}.${day}`
}
const compareIsoDate = (left, right) => normalizeText(left).localeCompare(normalizeText(right))
const formatShipmentTitle = (value) => `${formatKoreanDate(value)} 출하일정`
const isRangeFilterActive = computed(() => Boolean(normalizeText(dateRangeStart.value) || normalizeText(dateRangeEnd.value)))
const normalizedDateRange = computed(() => {
  const start = normalizeText(dateRangeStart.value)
  const end = normalizeText(dateRangeEnd.value)
  if (start && end && compareIsoDate(start, end) > 0) return { start: end, end: start }
  return { start, end }
})
const formatShipmentListTitle = computed(() => {
  if (!isRangeFilterActive.value) return formatShipmentTitle(currentViewDate.value)
  const { start, end } = normalizedDateRange.value
  if (start && end) return `${formatKoreanDate(start)} ~ ${formatKoreanDate(end)} 출하일정`
  if (start) return `${formatKoreanDate(start)} 이후 출하일정`
  return `${formatKoreanDate(end)} 이전 출하일정`
})
const getScheduleTypeLabel = (value) =>
  SCHEDULE_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? (normalizeText(value) || '-')
const getFloatStatusLabel = (value) =>
  FLOAT_STATUS_OPTIONS.find((item) => item.value === value)?.label ?? (normalizeText(value) || '-')
const normalizeRow = (row) => ({
  id: row.id,
  company: normalizeText(row.company),
  place: normalizeText(row.place),
  area: normalizeText(row.area),
  shipmentDate: normalizeText(row.shipment_date),
  scheduleType: normalizeText(row.schedule_type),
  arrivalTime: normalizeText(row.arrival_time),
  floatStatus: normalizeText(row.float_status),
  managerId: row.manager_id ? String(row.manager_id) : '',
  createdAt: normalizeText(row.created_at),
})

const filteredRows = computed(() => {
  const keyword = normalizeText(listSearchText.value).toLowerCase()
  const { start, end } = normalizedDateRange.value
  const baseRows = rows.value
    .filter((row) => {
      if (!isRangeFilterActive.value) return compareIsoDate(row.shipmentDate, currentViewDate.value) === 0
      if (start && compareIsoDate(row.shipmentDate, start) < 0) return false
      if (end && compareIsoDate(row.shipmentDate, end) > 0) return false
      return true
    })
    .map((row) => ({
      ...row,
      managerName: managerNameMap.value[row.managerId] ?? '',
    }))
    .sort((left, right) => {
      const byCompany = left.company.localeCompare(right.company, 'ko')
      if (byCompany !== 0) return byCompany
      const byPlace = left.place.localeCompare(right.place, 'ko')
      if (byPlace !== 0) return byPlace
      return left.area.localeCompare(right.area, 'ko')
    })
  if (!keyword) return baseRows
  return baseRows.filter((row) => {
    const target = `${row.managerName} ${row.company} ${row.place} ${row.area}`.toLowerCase()
    return target.includes(keyword)
  })
})
const dialogTitle = computed(() => (form.id ? '출하일정 수정' : '출하일정 등록'))

const resetForm = () => {
  form.id = null
  form.company = ''
  form.place = ''
  form.area = ''
  form.shipmentDate = currentViewDate.value || formatIsoDate()
  form.scheduleType = 'day'
  form.arrivalTime = ''
  form.hasPlot = false
  form.floatStatus = 'O'
  companyPlaceSearchText.value = ''
  companyPlaceResults.value = []
}

const openCreateDialog = () => {
  saveError.value = ''
  resetForm()
  isDialogOpen.value = true
}

const openEditDialog = (row) => {
  saveError.value = ''
  form.id = row.id
  form.company = row.company
  form.place = row.place
  form.area = row.area
  form.shipmentDate = row.shipmentDate
  form.scheduleType = row.scheduleType || 'day'
  form.arrivalTime = row.arrivalTime || ''
  form.hasPlot = Boolean(row.floatStatus)
  form.floatStatus = row.floatStatus || 'O'
  companyPlaceSearchText.value = [row.company, row.place].filter(Boolean).join(' / ')
  companyPlaceResults.value = []
  isDialogOpen.value = true
}

const closeDialog = () => {
  isDialogOpen.value = false
  saveError.value = ''
  resetForm()
}

const openPrintSettings = () => {
  isPrintSettingsOpen.value = true
}

const printScheduleTable = async (options = {}) => {
  isPrintSettingsOpen.value = false
  await printCurrentPage(isPrinting, options, { margin: '0' })
}

const moveViewDate = (days) => {
  clearDateRange()
  currentViewDate.value = addDays(currentViewDate.value, days)
}

const resetViewDate = () => {
  clearDateRange()
  currentViewDate.value = formatIsoDate()
}

const clearDateRange = () => {
  dateRangeStart.value = ''
  dateRangeEnd.value = ''
}

const isCompanyPlaceLocked = computed(() => Boolean(normalizeText(form.company)) && Boolean(normalizeText(form.place)))
const companyPlaceResultItems = computed(() => companyPlaceResults.value.slice(0, 5))

const runCompanyPlaceSearch = () => {
  const keyword = normalizeText(companyPlaceSearchText.value).toLowerCase()
  if (!keyword || isCompanyPlaceLocked.value) {
    companyPlaceResults.value = []
    return
  }

  const matched = companyOptions.value.filter((item) => {
    const target = `${item.company} ${item.place}`.toLowerCase()
    return target.includes(keyword)
  })

  companyPlaceResults.value = matched.slice(0, 5)
}

const selectCompanyPlace = (item) => {
  form.company = item.company
  form.place = item.place
  companyPlaceSearchText.value = `${item.company} / ${item.place}`
  companyPlaceResults.value = []
}

const clearCompanyPlaceSelection = () => {
  form.company = ''
  form.place = ''
  companyPlaceSearchText.value = ''
  companyPlaceResults.value = []
}

const parseWorkerDate = (value) => {
  const raw = normalizeText(value)
  if (!raw) return null
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const [, y, m, d] = iso
    const parsed = new Date(Number(y), Number(m) - 1, Number(d))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const dot = raw.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})/)
  if (dot) {
    const [, y, m, d] = dot
    const parsed = new Date(2000 + Number(y), Number(m) - 1, Number(d))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

const formatShortYmd = (date) => {
  if (!date) return ''
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

const resolveCompletionYmd = (row) => {
  const dates = [
    parseWorkerDate(row?.worker_t_time),
    parseWorkerDate(row?.worker_main_time),
    parseWorkerDate(row?.worker_nasa_time),
    parseWorkerDate(row?.worker_welding_time),
  ].filter(Boolean)
  if (dates.length === 0) return ''
  const latest = dates.sort((a, b) => a.getTime() - b.getTime())[dates.length - 1]
  return formatShortYmd(latest)
}

const formatTestDateShort = (value) => {
  const raw = normalizeText(value)
  if (!raw) return ''
  const matched = raw.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/)
  if (matched) {
    const [, y, m, d] = matched
    return `${String(y).slice(2)}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const [, y, m, d] = iso
    return `${String(y).slice(2)}.${m}.${d}`
  }
  return raw
}

const filteredPendingRows = computed(() => {
  const keyword = normalizeText(pendingSearchText.value).toLowerCase()
  const base = [...pendingRows.value].sort((left, right) => {
    const leftDate = normalizeText(left.completeDate)
    const rightDate = normalizeText(right.completeDate)
    if (leftDate && !rightDate) return -1
    if (!leftDate && rightDate) return 1
    const byDate = leftDate.localeCompare(rightDate)
    if (byDate !== 0) return byDate
    const byCompany = normalizeText(left.company).localeCompare(normalizeText(right.company), 'ko')
    if (byCompany !== 0) return byCompany
    const byPlace = normalizeText(left.place).localeCompare(normalizeText(right.place), 'ko')
    if (byPlace !== 0) return byPlace
    return normalizeText(left.area).localeCompare(normalizeText(right.area), 'ko')
  })
  if (!keyword) return base
  return base.filter((row) => {
    const target = `${row.company} ${row.place} ${row.area} ${row.initial ?? ''} ${row.name ?? ''}`.toLowerCase()
    return target.includes(keyword)
  })
})

const fetchPendingShipments = async ({ silent = false } = {}) => {
  if (!session.value) {
    pendingRows.value = []
    return
  }

  if (!silent) pendingLoading.value = true
  pendingError.value = ''
  const { data, error } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .select('id,company,place,area,initial,name,test_date,complete_date,head,hole,groove,weight,work_type,worker_t_time,worker_main_time,worker_nasa_time,worker_welding_time')
    .eq('complete', true)
    .eq('shipment', false)
    .eq('hold', false)
    .order('company', { ascending: true })
    .order('place', { ascending: true })
    .order('area', { ascending: true })

  if (!silent) pendingLoading.value = false
  if (error) {
    if (!silent) pendingRows.value = []
    pendingError.value = `출하대기 조회 실패: ${error.message}`
    return
  }

  pendingRows.value = (data ?? []).map((row) => ({
    id: row.id,
    company: normalizeText(row.company),
    place: normalizeText(row.place),
    area: normalizeText(row.area),
    initial: normalizeText(row.initial),
    name: normalizeText(row.name),
    testDate: formatTestDateShort(row.test_date),
    completeDate: resolveCompletionYmd(row) || normalizeText(row.complete_date),
    head: Number(row.head ?? 0),
    hole: Number(row.hole ?? 0),
    groove: Number(row.groove ?? 0),
    weight: Number(row.weight ?? 0),
    workType: normalizeText(row.work_type),
  }))
}

const markAsShipped = async (row) => {
  if (!row?.id) return
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const HH = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const finalTimeStr = `${yy}.${mm}.${dd} ${HH}:${min}`

  const updates = { shipment: true }
  const workerFields = [
    { status: 'worker_t', time: 'worker_t_time_final' },
    { status: 'worker_nasa', time: 'worker_nasa_time_final' },
    { status: 'worker_main', time: 'worker_main_time_final' },
    { status: 'worker_welding', time: 'worker_welding_time_final' },
  ]
  const { data: current } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .select('worker_t,worker_nasa,worker_main,worker_welding')
    .eq('id', row.id)
    .maybeSingle()
  if (current) {
    for (const f of workerFields) {
      if (current[f.status] === '작업완료') {
        updates[f.status] = '출하완료'
        updates[f.time] = finalTimeStr
      }
    }
  }
  pendingRows.value = pendingRows.value.filter((item) => item.id !== row.id)
  const { error } = await supabase.from(PRODUCT_LIST_TABLE).update(updates).eq('id', row.id)
  if (error) {
    pendingError.value = `출하 처리 실패: ${error.message}`
    await fetchPendingShipments({ silent: true })
    return
  }
  await fetchPendingShipments({ silent: true })
}

const fetchShipmentSchedules = async () => {
  if (!session.value) {
    rows.value = []
    return
  }

  loading.value = true
  errorMessage.value = ''
  const { data, error } = await supabase
    .from(SHIPMENT_SCHEDULE_TABLE)
    .select('id,company,place,manager_id,area,shipment_date,schedule_type,arrival_time,float_status,created_at')
    .order('shipment_date', { ascending: true })
    .order('created_at', { ascending: false })

  loading.value = false
  if (error) {
    rows.value = []
    errorMessage.value = `출하일정 조회 실패: ${error.message}`
    return
  }

  rows.value = (data ?? []).map(normalizeRow)
}

const fetchCompanyOptions = async () => {
  if (!session.value) {
    companyOptions.value = []
    return
  }

  loadingCompanyOptions.value = true
  const { data, error } = await supabase
    .from(COMPANY_LIST_TABLE)
    .select('company,place,manager_id')
    .order('company', { ascending: true })
    .order('place', { ascending: true })
  loadingCompanyOptions.value = false

  if (error) {
    companyOptions.value = []
    errorMessage.value = `회사/현장 조회 실패: ${error.message}`
    return
  }

  companyOptions.value = (data ?? []).map((item) => ({
    company: normalizeText(item.company),
    place: normalizeText(item.place),
    managerId: item.manager_id ? String(item.manager_id) : '',
  }))

  const managerIds = [...new Set(companyOptions.value.map((item) => item.managerId).filter(Boolean))]
  if (managerIds.length === 0) {
    managerNameMap.value = {}
    return
  }

  const { data: managerRows, error: managerError } = await supabase
    .from('profiles')
    .select('id,name')
    .in('id', managerIds)

  if (managerError) {
    managerNameMap.value = {}
    return
  }

  managerNameMap.value = Object.fromEntries(
    (managerRows ?? []).map((item) => [String(item.id), normalizeText(item.name) || '-']),
  )
}

const resolveManagerId = async ({ company, place }) => {
  const { data, error } = await supabase
    .from(COMPANY_LIST_TABLE)
    .select('manager_id')
    .eq('company', company)
    .eq('place', place)
    .limit(1)
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message, managerId: null }
  }

  return { ok: true, managerId: data?.manager_id ?? null }
}

const submit = async () => {
  saveError.value = ''

  const company = normalizeText(form.company)
  const place = normalizeText(form.place)
  const area = normalizeText(form.area)
  const shipmentDate = normalizeText(form.shipmentDate)
  const scheduleType = normalizeText(form.scheduleType)
  const arrivalTime = normalizeText(form.arrivalTime)
  const floatStatus = form.hasPlot ? normalizeText(form.floatStatus || 'O') : ''

  if (!company) {
    saveError.value = '회사명을 입력해주세요.'
    return
  }
  if (!place) {
    saveError.value = '현장명을 입력해주세요.'
    return
  }
  if (!shipmentDate) {
    saveError.value = '출하일을 선택해주세요.'
    return
  }
  if (!['day', 'night'].includes(scheduleType)) {
    saveError.value = '일정 구분을 선택해주세요.'
    return
  }
  if (form.hasPlot && !['O', 'X'].includes(floatStatus)) {
    saveError.value = '플롯 상태를 선택해주세요.'
    return
  }

  saving.value = true
  const managerResult = await resolveManagerId({ company, place })
  if (!managerResult.ok) {
    saving.value = false
    saveError.value = `담당자 조회 실패: ${managerResult.message}`
    return
  }

  const payload = {
    company,
    place,
    manager_id: managerResult.managerId,
    area: area || null,
    shipment_date: shipmentDate,
    schedule_type: scheduleType,
    arrival_time: arrivalTime || null,
    float_status: form.hasPlot ? floatStatus : null,
  }

  const query = form.id
    ? supabase.from(SHIPMENT_SCHEDULE_TABLE).update(payload).eq('id', form.id)
    : supabase.from(SHIPMENT_SCHEDULE_TABLE).insert(payload)

  const { error } = await query
  saving.value = false

  if (error) {
    saveError.value = `출하일정 저장 실패: ${error.message}`
    return
  }

  await fetchShipmentSchedules()
  closeDialog()
}

const deleteShipmentSchedule = async () => {
  if (!form.id || deleting.value) return

  const targetName = [form.company, form.place, form.area].filter(Boolean).join(' ')
  if (!window.confirm(`${targetName || '선택한 출하일정'}을 삭제할까요?`)) return

  saveError.value = ''
  deleting.value = true
  const { error } = await supabase.from(SHIPMENT_SCHEDULE_TABLE).delete().eq('id', form.id)
  deleting.value = false

  if (error) {
    saveError.value = `출하일정 삭제 실패: ${error.message}`
    return
  }

  await fetchShipmentSchedules()
  closeDialog()
}

watch(
  () => session.value,
  async (nextSession) => {
    if (!nextSession) {
      rows.value = []
      pendingRows.value = []
      companyOptions.value = []
      return
    }
    await Promise.all([fetchShipmentSchedules(), fetchCompanyOptions(), fetchPendingShipments()])
  },
  { immediate: true },
)

onMounted(async () => {
  if (!session.value) return
  await Promise.all([fetchShipmentSchedules(), fetchCompanyOptions(), fetchPendingShipments()])
})
</script>

<template>
  <main class="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-6 md:px-6">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section class="shipment-print-hide rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="text-sm font-bold text-slate-500">출하일정</p>
            <h1 class="mt-1 text-2xl font-extrabold text-slate-900">출하일정</h1>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button v-if="activeTab === 'shipment'" variant="outline" @click="fetchShipmentSchedules">새로고침</Button>
            <Button v-else variant="outline" @click="fetchPendingShipments({ silent: true })">새로고침</Button>
            <Button v-if="activeTab === 'shipment'" @click="openCreateDialog">출하일정 등록</Button>
            <Button v-if="activeTab === 'shipment'" variant="outline" :disabled="isPrinting" @click="openPrintSettings">인쇄</Button>
          </div>
        </div>
        <div class="mt-5 flex gap-2 border-b border-slate-200">
          <button
            type="button"
            class="px-5 py-3 text-sm font-bold transition-colors"
            :class="activeTab === 'shipment' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'"
            @click="activeTab = 'shipment'"
          >
            출하
          </button>
          <button
            type="button"
            class="px-5 py-3 text-sm font-bold transition-colors"
            :class="activeTab === 'pending' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'"
            @click="activeTab = 'pending'"
          >
            출하대기
            <span class="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
              {{ pendingRows.length }}
            </span>
          </button>
        </div>
      </section>

      <section v-if="activeTab === 'shipment'" class="shipment-print-shell rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="shipment-print-hide flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <Button
              class="h-10 px-4 text-sm"
              variant="outline"
              @click="moveViewDate(-1)"
            >
              지난일
            </Button>
            <Button
              class="h-10 px-4 text-sm"
              :variant="compareIsoDate(currentViewDate, formatIsoDate()) === 0 ? 'default' : 'outline'"
              @click="resetViewDate"
            >
              오늘
            </Button>
            <Button
              class="h-10 px-4 text-sm"
              variant="outline"
              @click="moveViewDate(1)"
            >
              다음일
            </Button>
            <div class="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
              <input
                v-model="dateRangeStart"
                type="date"
                class="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
                aria-label="조회 시작일"
              />
              <span class="text-xs font-bold text-slate-400">~</span>
              <input
                v-model="dateRangeEnd"
                type="date"
                class="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
                aria-label="조회 종료일"
              />
              <button
                v-if="isRangeFilterActive"
                type="button"
                class="h-8 rounded-lg px-2 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-700"
                @click="clearDateRange"
              >
                해제
              </button>
            </div>
            <input
              v-model="listSearchText"
              type="text"
              class="h-10 w-full min-w-[240px] rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 md:w-[280px]"
              placeholder="담당자, 회사명, 현장명, 구역 검색"
            />
            <span class="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{{ filteredRows.length }}건</span>
          </div>
          <p v-if="loadingCompanyOptions" class="text-xs font-semibold text-slate-500">회사/현장 목록을 불러오는 중...</p>
        </div>

        <div v-if="loading" class="py-10 text-center text-sm text-slate-500">출하일정을 불러오는 중입니다.</div>
        <div v-else-if="errorMessage" class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {{ errorMessage }}
        </div>
        <div v-else class="shipment-print-table-wrap mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <div class="shipment-print-title-bar border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-extrabold text-slate-900">
            {{ formatShipmentListTitle }}
          </div>
          <table class="shipment-print-table w-full border-collapse text-sm">
            <colgroup>
              <col v-if="isRangeFilterActive" style="width: 65px" />
              <col :style="{ width: isRangeFilterActive ? '9%' : '5%' }" />
              <col :style="{ width: isRangeFilterActive ? '10%' : '10%' }" />
              <col :style="{ width: isRangeFilterActive ? '16%' : '17%' }" />
              <col :style="{ width: isRangeFilterActive ? '34%' : '35%' }" />
              <col :style="{ width: isRangeFilterActive ? '9%' : '12%' }" />
              <col :style="{ width: isRangeFilterActive ? '9%' : '12%' }" />
              <col :style="{ width: isRangeFilterActive ? '6%' : '9%' }" />
            </colgroup>
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th v-if="isRangeFilterActive" class="border border-slate-200 px-3 py-3 text-center font-bold">날짜</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">담당자</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">회사명</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">현장명</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">구역명</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">당착</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">야상</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">플롯</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredRows.length === 0">
                <td :colspan="isRangeFilterActive ? 8 : 7" class="border border-slate-200 px-3 py-8 text-center text-slate-400">등록된 출하일정이 없습니다.</td>
              </tr>
              <tr
                v-for="(row, index) in filteredRows"
                :key="row.id"
                class="cursor-pointer bg-white hover:bg-slate-50"
                @click="openEditDialog(row)"
              >
                <td v-if="isRangeFilterActive" class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ formatShortMonthDay(row.shipmentDate) }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.managerName || '' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.company || '' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.place || '' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.area || '' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.scheduleType === 'day' ? (row.arrivalTime || 'O') : '' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.scheduleType === 'night' ? (row.arrivalTime || 'O') : '' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.floatStatus || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="activeTab === 'pending'" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model="pendingSearchText"
              type="text"
              class="h-10 w-full min-w-[240px] rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 md:w-[320px]"
              placeholder="회사명, 현장명, 구역, 도번, 담당자 검색"
            />
            <span class="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{{ filteredPendingRows.length }}건</span>
          </div>
        </div>

        <div v-if="pendingLoading" class="py-10 text-center text-sm text-slate-500">출하대기 목록을 불러오는 중입니다.</div>
        <div v-else-if="pendingError" class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {{ pendingError }}
        </div>
        <div v-else class="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <div class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-extrabold text-slate-900">
            출하대기 목록
          </div>
          <table class="w-full border-collapse text-sm">
            <colgroup>
              <col style="width: 7%" />
              <col style="width: 7%" />
              <col style="width: 11%" />
              <col style="width: 16%" />
              <col style="width: 18%" />
              <col style="width: 6%" />
              <col style="width: 6%" />
              <col style="width: 9%" />
              <col style="width: 9%" />
              <col style="width: 11%" />
            </colgroup>
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">도번</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">담당자</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">회사명</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">현장명</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">구역명</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">헤드</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">홀</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">검수일</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">완료일</th>
                <th class="border border-slate-200 px-3 py-3 text-center font-bold">출하처리</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredPendingRows.length === 0">
                <td colspan="10" class="border border-slate-200 px-3 py-8 text-center text-slate-400">출하대기 품목이 없습니다.</td>
              </tr>
              <tr
                v-for="row in filteredPendingRows"
                :key="row.id"
                class="bg-white hover:bg-slate-50"
              >
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.initial || '-' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.name || '-' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.company || '-' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.place || '-' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.area || '-' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.head || '' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.hole || '' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.testDate || '-' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center text-slate-700">{{ row.completeDate || '-' }}</td>
                <td class="border border-slate-200 px-3 py-3 text-center">
                  <Button class="h-8 px-3 text-xs" @click="markAsShipped(row)">출하완료</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <PrintSettingsDialog
      :open="isPrintSettingsOpen"
      @close="isPrintSettingsOpen = false"
      @print="printScheduleTable"
    />

    <div
      v-if="isDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
      @click.self="closeDialog"
    >
      <section class="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-slate-500">출하일정</p>
            <h2 class="mt-1 text-2xl font-extrabold text-slate-900">{{ dialogTitle }}</h2>
          </div>
          <Button variant="outline" :disabled="saving || deleting" @click="closeDialog">닫기</Button>
        </div>

        <div v-if="saveError" class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {{ saveError }}
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="space-y-2 md:col-span-2">
            <label class="text-sm font-bold text-slate-700">회사명 / 현장명 검색</label>
            <div class="flex gap-2">
              <input
                v-model="companyPlaceSearchText"
                :disabled="isCompanyPlaceLocked"
                type="text"
                class="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="회사명 또는 현장명을 입력하세요"
                @keydown.enter.prevent="runCompanyPlaceSearch"
              />
              <Button class="h-11 px-4 text-sm" variant="outline" :disabled="isCompanyPlaceLocked" @click="runCompanyPlaceSearch">검색</Button>
              <Button v-if="isCompanyPlaceLocked" class="h-11 px-4 text-sm" variant="outline" @click="clearCompanyPlaceSelection">해제</Button>
            </div>
            <div v-if="companyPlaceResultItems.length > 0" class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button
                v-for="item in companyPlaceResultItems"
                :key="`${item.company}-${item.place}`"
                type="button"
                class="flex w-full items-center justify-between border-t border-slate-100 px-4 py-3 text-left text-sm text-slate-700 first:border-t-0 hover:bg-slate-50"
                @click="selectCompanyPlace(item)"
              >
                <span class="font-semibold text-slate-900">{{ item.company }}</span>
                <span class="text-slate-500">{{ item.place }}</span>
              </button>
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">구역명</label>
            <input v-model="form.area" type="text" class="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-700" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">출하일</label>
            <input v-model="form.shipmentDate" type="date" class="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-700" />
          </div>
          <div class="space-y-2 md:col-span-2">
            <label class="text-sm font-bold text-slate-700">일정 구분</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="option in SCHEDULE_TYPE_OPTIONS"
                :key="option.value"
                class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                <input v-model="form.scheduleType" type="radio" :value="option.value" />
                <span>{{ option.label }}</span>
              </label>
              <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                <input v-model="form.hasPlot" type="checkbox" />
                <span>플롯</span>
              </label>
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">상차시간</label>
            <input
              v-model="form.arrivalTime"
              type="text"
              placeholder="예: 08:30"
              class="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-700"
            />
          </div>
          <div v-if="form.hasPlot" class="space-y-2">
            <label class="text-sm font-bold text-slate-700">플롯 상태</label>
            <div class="flex gap-2">
              <label
                v-for="option in FLOAT_STATUS_OPTIONS"
                :key="option.value"
                class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                <input v-model="form.floatStatus" type="radio" :value="option.value" />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>

        </div>

        <div class="mt-6 flex justify-end gap-2">
          <Button :disabled="saving || deleting" @click="submit">{{ saving ? '저장 중...' : form.id ? '수정 저장' : '등록 저장' }}</Button>
          <Button
            v-if="form.id"
            variant="outline"
            class="border-rose-200 text-rose-600 hover:bg-rose-50"
            :disabled="saving || deleting"
            @click="deleteShipmentSchedule"
          >
            {{ deleting ? '삭제 중...' : '삭제' }}
          </Button>
          <Button variant="outline" :disabled="saving || deleting" @click="closeDialog">취소</Button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
@media print {
  @page {
    margin: 0;
  }

  .shipment-print-hide {
    display: none !important;
  }

  main {
    min-height: auto !important;
    background: #fff !important;
    padding: 0 !important;
  }

  main > div {
    max-width: none !important;
    width: 100% !important;
    padding: 0 !important;
    gap: 0 !important;
  }

  .shipment-print-shell {
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  .shipment-print-table-wrap {
    margin-top: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    overflow: visible !important;
  }

  .shipment-print-title-bar {
    border-left: 0 !important;
    border-right: 0 !important;
    border-top: 0 !important;
    background: #fff !important;
    padding: 4mm 0 3mm !important;
  }

  .shipment-print-table {
    width: 100% !important;
  }
}
</style>
