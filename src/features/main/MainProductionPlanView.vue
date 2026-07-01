<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { CalendarDays, ClipboardList, Printer, Search } from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import MainProductionPlanGroupTable from '@/features/main/MainProductionPlanGroupTable.vue'
import PrintSettingsDialog from '@/features/printing/PrintSettingsDialog.vue'
import { printCurrentPage } from '@/features/printing/pagePrint'
import { useDialog } from '@/composables/useDialog'
import { isAdminRole, isProductionAdmin } from '@/utils/adminAccess'
import { WELDING_INSPECTORS, getWeldingInspectorClass } from '@/utils/productionStatus'
import { sanitizeDecimalOne } from '@/features/main/productionPlanNumbers'
import { WELDING_SCHEDULE_PERMISSION_ERROR } from '@/features/welding-schedule/utils/weldingSchedulePermission'
import CncPlanRegisterDialog from '@/features/cnc/components/CncPlanRegisterDialog.vue'

const { confirm, alert } = useDialog()

const props = defineProps({
  pageTitle: { type: String, required: true },
  weekOffset: { type: Number, default: 0 },
  selectedTuesdayIso: { type: String, default: '' },
  searchText: { type: String, default: '' },
  searchAllDates: { type: Boolean, default: false },
  planLoading: { type: Boolean, default: false },
  planError: { type: String, default: '' },
  groupedRows: { type: Array, default: () => [] },
  currentWorkMan: { type: String, default: '' },
  currentRole: { type: String, default: '' },
  canManageWeldingSchedule: { type: Boolean, default: false },
})

const emit = defineEmits([
  'move-week',
  'reset-week',
  'go-register',
  'go-stats',
  'go-cnc',
  'search-change',
  'select-tuesday',
  'edit-row',
  'toggle-row-inspection',
  'toggle-row-hold',
  'delete-row',
  'cell-action',
  'ship-row',
  'cancel-ship-row',
  'move-test-date',
  'add-welding-schedule',
  'remove-welding-schedule',
  'load-drawing-files',
  'upload-drawing-files',
  'delete-drawing-file',
  'welding-long-press',
  'nasa-long-press',
  'welding-start',
  'update-inch',
  'register-cnc',
  'cancel-cnc',
])

const overallTotals = computed(() =>
  props.groupedRows.reduce(
    (acc, group) => {
      acc.head += Number(group?.totals?.head ?? 0)
      acc.hole += Number(group?.totals?.hole ?? 0)
      acc.groove += Number(group?.totals?.groove ?? 0)
      acc.inch += Number(group?.totals?.inch ?? 0)
      acc.weight += Number(group?.totals?.weight ?? 0)
      return acc
    },
    { head: 0, hole: 0, groove: 0, inch: 0, weight: 0 },
  ),
)

const isCalendarDialogOpen = ref(false)
const isSearchDialogOpen = ref(false)
const localCalendarValue = ref('')
const localSearchText = ref('')
const localSearchAllDates = ref(false)
const localCalendarMonth = ref(new Date())
const isPrinting = ref(false)
const isPrintSettingsOpen = ref(false)
const calendarWeekLabels = ['일', '월', '화', '수', '목', '금', '토']
const isRowDialogOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const selectedRowId = ref(null)
const isTestDateDialogOpen = ref(false)
const pendingTestDateIso = ref('')
const activeTestDateRow = ref(null)
const isCncRegisterDialogOpen = ref(false)
const cncRegisterSaving = ref(false)
const cncCancelSaving = ref(false)
const isWeldingScheduleInspectorDialogOpen = ref(false)
const isWeldingScheduleDateDialogOpen = ref(false)
const activeWeldingScheduleRow = ref(null)
const weldingScheduleDateIso = ref('')
const weldingScheduleCalendarMonth = ref(new Date())
const selectedWeldingScheduleInspector = ref('')
const isInchDialogOpen = ref(false)
const activeInchRow = ref(null)
const inchInput = ref('')

const isShipmentConfirmOpen = ref(false)
const activeShipmentRow = ref(null)
const shipmentMode = ref('ship') // 'ship' | 'cancel'
const activeShipmentWorkerName = computed(() => String(activeShipmentRow.value?.welding_inspector ?? '').trim() || '미지정')
const activeShipmentWorkerClass = computed(() => getWeldingInspectorClass(activeShipmentWorkerName.value))
const snackbarMessage = ref('')
const snackbarVisible = ref(false)
let snackbarTimer = null

const isWeldingInspectorDialogOpen = ref(false)
const weldingInspectorDialogRow = ref(null)

const openWeldingInspectorDialog = (row) => {
  weldingInspectorDialogRow.value = row
  isWeldingInspectorDialogOpen.value = true
}
const closeWeldingInspectorDialog = () => {
  isWeldingInspectorDialogOpen.value = false
  weldingInspectorDialogRow.value = null
}
const selectWeldingInspector = (inspector) => {
  if (!weldingInspectorDialogRow.value) return
  emit('welding-start', { row: weldingInspectorDialogRow.value, inspector })
  closeWeldingInspectorDialog()
}
const getNasaStatus = (row) => String(row?.nasa_status ?? '').trim() || String(row?.worker_nasa ?? '').trim()
const canToggleNasaStatus = (row) => {
  const status = getNasaStatus(row)
  return !status || status === '없음' || status === '작업전' || status === '작업중'
}
const canControlNasaWork = () => {
  const workMan = String(props.currentWorkMan ?? '').trim()
  return workMan === '무용접' || workMan === '나사' || isProductionAdmin(props.currentRole)
}
const canControlProductionWork = () => {
  const workMan = String(props.currentWorkMan ?? '').trim()
  return ['생산', '마킹1', '마킹2', '레이저1', '티&면치'].includes(workMan) || isProductionAdmin(props.currentRole)
}
const canControlMainWork = () => {
  const workMan = String(props.currentWorkMan ?? '').trim()
  return workMan === '메인' || workMan === '레이저2' || isProductionAdmin(props.currentRole)
}
const canToggleWorkerStatus = (value) => {
  const status = String(value ?? '').trim()
  return !status || status === '없음' || status === '작업전' || status === '작업중'
}
const canOpenShipmentConfirm = (row) =>
  Boolean(row?.complete) ||
  row?.worker_t === '작업완료' ||
  row?.worker_nasa === '작업완료' ||
  row?.worker_main === '작업완료'

const isDrawingDialogOpen = ref(false)
const drawingFiles = ref([])
const drawingLoading = ref(false)
const drawingError = ref('')
const drawingUploadError = ref('')
const drawingUploading = ref(false)
const drawingFileInput = ref(null)
const selectedDrawingUrl = ref('')
const activeDrawingRow = ref(null)
const drawingDeletingId = ref(null)
const suppressDrawingClickId = ref(null)
let drawingLongPressTimer = null
const DRAWING_LONG_PRESS_MS = 700
const formatDrawingDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

const headerLegendBadges = [
  { label: '증지만듦', className: 'border-yellow-300 bg-yellow-200 text-yellow-900' },
  { label: '배포확인', className: 'border-blue-300 bg-blue-300 text-blue-950' },
  { label: '산출완료', className: 'border-lime-200 bg-lime-100 text-lime-900' },
  { label: '도면배포', className: 'border-slate-300 bg-slate-100 text-slate-700' },
  { label: '보류', className: 'border-orange-200 bg-orange-100 text-orange-900' },
  { label: '민뚜라', className: 'border-cyan-300 bg-cyan-200 text-cyan-950' },
  { label: '진민택', className: 'border-fuchsia-300 bg-fuchsia-200 text-fuchsia-950' },
  { label: 'CNC', className: 'border-violet-300 bg-violet-200 text-violet-950' },
]

const formatKoreanDateLabel = (value) => {
  const parsed = parseIsoDate(value)
  if (!parsed) return '-'
  return `${parsed.getFullYear()}년 ${String(parsed.getMonth() + 1).padStart(2, '0')}월 ${String(parsed.getDate()).padStart(2, '0')}일`
}

watch(
  () => [props.searchText, props.searchAllDates],
  ([text, allDates]) => {
    localSearchText.value = String(text ?? '')
    localSearchAllDates.value = Boolean(allDates)
  },
  { immediate: true },
)

watch(
  () => props.selectedTuesdayIso,
  (value) => {
    localCalendarValue.value = String(value ?? '')
    syncCalendarMonth(localCalendarValue.value)
  },
  { immediate: true },
)

function parseIsoDate(value) {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return null
  const [, y, m, d] = matched
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

function formatIsoDate(date) {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function syncCalendarMonth(value) {
  const parsed = parseIsoDate(value)
  const base = parsed ?? new Date()
  localCalendarMonth.value = new Date(base.getFullYear(), base.getMonth(), 1)
}

const isCalendarTuesday = computed(() => {
  const date = parseIsoDate(localCalendarValue.value)
  return Boolean(date) && date.getDay() === 2
})

const hasActiveSearch = computed(() => String(props.searchText ?? '').trim().length > 0)
const visibleGroups = computed(() => {
  if (!hasActiveSearch.value) return props.groupedRows
  return props.groupedRows.filter((group) => Array.isArray(group?.rows) && group.rows.length > 0)
})

const activeDialogRow = computed(() => {
  if (!selectedRowId.value) return null
  for (const group of props.groupedRows) {
    const matched = group?.rows?.find((row) => row.id === selectedRowId.value)
    if (matched) return matched
  }
  return null
})

const inspectionActionLabel = computed(() => (activeDialogRow.value?.not_test ? '검수' : '비검수'))
const holdActionLabel = computed(() => (activeDialogRow.value?.hold ? '보류 해제' : '보류'))
const pendingTestDateLabel = computed(() => formatKoreanDateLabel(pendingTestDateIso.value))
const weldingScheduleDateLabel = computed(() => formatKoreanDateLabel(weldingScheduleDateIso.value))
const searchPlaceholder = computed(() =>
  localSearchAllDates.value ? '회사명, 현장명, 구역명, 도번 검색 가능' : '검색어를 입력해주세요',
)


const calendarMonthLabel = computed(() => {
  const base = localCalendarMonth.value
  return `${base.getFullYear()}년 ${String(base.getMonth() + 1).padStart(2, '0')}월`
})

const calendarWeeks = computed(() => {
  const monthStart = new Date(localCalendarMonth.value.getFullYear(), localCalendarMonth.value.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayIndex)
      date.setHours(0, 0, 0, 0)
      return {
        key: formatIsoDate(date),
        date,
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === localCalendarMonth.value.getMonth(),
        isTuesday: date.getDay() === 2,
        isSelected: formatIsoDate(date) === String(localCalendarValue.value ?? ''),
      }
    }),
  )
})

const weldingScheduleCalendarMonthLabel = computed(() => {
  const base = weldingScheduleCalendarMonth.value
  return `${base.getFullYear()}년 ${String(base.getMonth() + 1).padStart(2, '0')}월`
})

const weldingScheduleCalendarWeeks = computed(() => {
  const monthStart = new Date(weldingScheduleCalendarMonth.value.getFullYear(), weldingScheduleCalendarMonth.value.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayIndex)
      date.setHours(0, 0, 0, 0)
      return {
        key: formatIsoDate(date),
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === weldingScheduleCalendarMonth.value.getMonth(),
        isSelected: formatIsoDate(date) === String(weldingScheduleDateIso.value ?? ''),
      }
    }),
  )
})

const openCalendarDialog = () => {
  localCalendarValue.value = String(props.selectedTuesdayIso ?? '')
  syncCalendarMonth(localCalendarValue.value)
  isCalendarDialogOpen.value = true
}

const openSearchDialog = () => {
  localSearchText.value = String(props.searchText ?? '')
  localSearchAllDates.value = Boolean(props.searchAllDates)
  isSearchDialogOpen.value = true
}

const closeSearchDialog = () => {
  localSearchText.value = String(props.searchText ?? '')
  localSearchAllDates.value = Boolean(props.searchAllDates)
  isSearchDialogOpen.value = false
}

const closeCalendarDialog = () => {
  isCalendarDialogOpen.value = false
}

const handleSearchInput = (value) => {
  localSearchText.value = value
}

const handleSearchAllDatesChange = (event) => {
  localSearchAllDates.value = Boolean(event?.target?.checked)
  if (!localSearchAllDates.value) {
    submitSearch()
    return
  }

  if (String(localSearchText.value ?? '').trim()) {
    submitSearch()
    return
  }

  showSnackbar('검색어를 입력해주세요.')
}

const submitSearch = () => {
  if (localSearchAllDates.value && !String(localSearchText.value ?? '').trim()) {
    showSnackbar('검색어를 입력해주세요.')
    return
  }

  emit('search-change', {
    text: localSearchText.value,
    allDates: localSearchAllDates.value,
  })
  isSearchDialogOpen.value = false
}

const moveCalendarMonth = (delta) => {
  const base = localCalendarMonth.value
  localCalendarMonth.value = new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

const selectCalendarDate = (day) => {
  if (!day?.isTuesday) return
  localCalendarValue.value = day.key
  emit('select-tuesday', day.key)
  closeCalendarDialog()
}

const openRowMenu = (row) => {
  if (!row?.id) return
  selectedRowId.value = row.id
  isDeleteConfirmOpen.value = false
  isRowDialogOpen.value = true
}

const closeRowDialog = () => {
  isDeleteConfirmOpen.value = false
  isRowDialogOpen.value = false
}

const openDeleteConfirm = () => {
  isDeleteConfirmOpen.value = true
}

const closeDeleteConfirm = () => {
  isDeleteConfirmOpen.value = false
}

const handleEditRow = () => {
  if (!activeDialogRow.value) return
  emit('edit-row', activeDialogRow.value)
  closeRowDialog()
}

const handleToggleInspection = () => {
  if (!activeDialogRow.value) return
  emit('toggle-row-inspection', activeDialogRow.value)
  closeRowDialog()
}

const handleToggleHold = () => {
  if (!activeDialogRow.value) return
  emit('toggle-row-hold', activeDialogRow.value)
  closeRowDialog()
}

const handleDeleteRow = () => {
  if (!activeDialogRow.value) return
  emit('delete-row', activeDialogRow.value)
  closeRowDialog()
}

const openInchDialog = (row) => {
  activeInchRow.value = row
  inchInput.value = sanitizeDecimalOne(row?.inch ?? '')
  isInchDialogOpen.value = true
}

const closeInchDialog = () => {
  isInchDialogOpen.value = false
  activeInchRow.value = null
  inchInput.value = ''
}

const handleInchInput = (value) => {
  inchInput.value = sanitizeDecimalOne(value)
}

const inchSubmitLabel = computed(() => {
  const currentValue = String(activeInchRow.value?.inch ?? '').trim()
  return currentValue ? '수정' : '저장'
})

const handleInchKeydown = (event) => {
  if (event.ctrlKey || event.metaKey) return
  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End', 'Enter'].includes(event.key)) return
  if (/^\d$/.test(event.key)) return
  if (event.key === '.' && !String(event.target?.value ?? '').includes('.')) return
  event.preventDefault()
}

const confirmInch = () => {
  if (!activeInchRow.value) return
  emit('update-inch', {
    row: activeInchRow.value,
    value: inchInput.value,
  })
  closeInchDialog()
}

const handleCellClick = ({ row, columnKey }) => {
  if (!row?.id || !columnKey) return
  if (columnKey === 'memo') {
    openRowMenu(row)
    return
  }
  if (columnKey === 'inch') {
    openInchDialog(row)
    return
  }
  if (columnKey === 'area') {
    activeTestDateRow.value = row
    const base = parseIsoDate(props.selectedTuesdayIso) ?? new Date()
    base.setHours(0, 0, 0, 0)
    base.setDate(base.getDate() + 7)
    pendingTestDateIso.value = formatIsoDate(base)
    isTestDateDialogOpen.value = true
    return
  }
  if (columnKey === 'drawing') {
    activeDrawingRow.value = row
    drawingLoading.value = true
    drawingError.value = ''
    drawingUploadError.value = ''
    drawingFiles.value = []
    selectedDrawingUrl.value = ''
    isDrawingDialogOpen.value = true
    emit('load-drawing-files', {
      rowId: row.id,
      onResult: (result) => {
        drawingLoading.value = false
        if (!result?.ok) {
          drawingError.value = '도면 조회 실패'
          return
        }
        drawingFiles.value = result.files ?? []
        const firstFile = drawingFiles.value.find((item) => String(item?.viewUrl ?? '').trim())
        selectedDrawingUrl.value = firstFile?.viewUrl ?? ''
      },
    })
    return
  }
  if (columnKey === 'worker_welding') {
    if (row?.shipment || String(row?.worker_welding ?? '').trim() === '출하완료') {
      activeShipmentRow.value = row
      shipmentMode.value = 'cancel'
      isShipmentConfirmOpen.value = true
      return
    }
    const currentWorkMan = String(props.currentWorkMan ?? '').trim()
    const isWeldingTeam = currentWorkMan === '용접반' || currentWorkMan === '용접' || WELDING_INSPECTORS.includes(currentWorkMan)
    const isAdmin = isAdminRole(props.currentRole)
    if (!isWeldingTeam && !isAdmin) {
      showSnackbar('용접반만 작업할 수 있습니다.')
      return
    }
    const weldingStatus = String(row.welding_status ?? '').trim()
    const isInitial = !weldingStatus || weldingStatus === '없음' || weldingStatus === '작업전'
    if (isInitial) {
      openWeldingInspectorDialog(row)
      return
    }
    emit('cell-action', { row, columnKey })
    return
  }
  if (columnKey === 'worker_nasa') {
    if (row?.shipment) {
      activeShipmentRow.value = row
      shipmentMode.value = 'cancel'
      isShipmentConfirmOpen.value = true
      return
    }
    if (canToggleNasaStatus(row)) {
      if (!canControlNasaWork()) {
        showSnackbar('무용접만 작업할 수 있습니다.')
        return
      }
      emit('cell-action', { row, columnKey })
      return
    }
    if (canOpenShipmentConfirm(row)) {
      activeShipmentRow.value = row
      shipmentMode.value = 'ship'
      isShipmentConfirmOpen.value = true
      return
    }
    showSnackbar('출하완료가 불가능합니다.')
    return
  }
  if (columnKey === 'worker_t') {
    if (row?.shipment) {
      activeShipmentRow.value = row
      shipmentMode.value = 'cancel'
      isShipmentConfirmOpen.value = true
      return
    }
    if (canToggleWorkerStatus(row?.worker_t)) {
      if (!canControlProductionWork()) {
        showSnackbar('생산 작업자만 작업할 수 있습니다.')
        return
      }
      emit('cell-action', { row, columnKey })
      return
    }
    if (canOpenShipmentConfirm(row)) {
      activeShipmentRow.value = row
      shipmentMode.value = 'ship'
      isShipmentConfirmOpen.value = true
      return
    }
    showSnackbar('출하완료가 불가능합니다.')
    return
  }
  if (columnKey === 'worker_main') {
    if (row?.shipment) {
      activeShipmentRow.value = row
      shipmentMode.value = 'cancel'
      isShipmentConfirmOpen.value = true
      return
    }
    if (canToggleWorkerStatus(row?.worker_main)) {
      if (!canControlMainWork()) {
        showSnackbar('메인 작업자만 작업할 수 있습니다.')
        return
      }
      emit('cell-action', { row, columnKey })
      return
    }
    if (canOpenShipmentConfirm(row)) {
      activeShipmentRow.value = row
      shipmentMode.value = 'ship'
      isShipmentConfirmOpen.value = true
      return
    }
    showSnackbar('출하완료가 불가능합니다.')
    return
  }

  emit('cell-action', { row, columnKey })
}
const handleCellLongPress = ({ row, columnKey }) => {
  if (columnKey === 'worker_t') {
    if (!canControlProductionWork()) {
      showSnackbar('생산 작업자만 작업할 수 있습니다.')
      return
    }
    emit('cell-action', { row, columnKey, reset: true })
    return
  }
  if (columnKey === 'worker_main') {
    if (!canControlMainWork()) {
      showSnackbar('메인 작업자만 작업할 수 있습니다.')
      return
    }
    emit('cell-action', { row, columnKey, reset: true })
    return
  }
  if (columnKey === 'worker_welding') {
    emit('welding-long-press', row)
    return
  }
  if (columnKey === 'worker_nasa') {
    if (!canControlNasaWork()) {
      showSnackbar('무용접만 작업할 수 있습니다.')
      return
    }
    emit('nasa-long-press', row)
  }
}

const closeShipmentConfirm = () => {
  isShipmentConfirmOpen.value = false
  activeShipmentRow.value = null
}

const handleConfirmShipment = () => {
  if (!activeShipmentRow.value) return
  if (shipmentMode.value === 'cancel') {
    emit('cancel-ship-row', activeShipmentRow.value)
  } else {
    emit('ship-row', activeShipmentRow.value)
  }
  closeShipmentConfirm()
}

const showSnackbar = (message) => {
  snackbarMessage.value = message
  snackbarVisible.value = true
  if (snackbarTimer) clearTimeout(snackbarTimer)
  snackbarTimer = setTimeout(() => {
    snackbarVisible.value = false
  }, 3000)
}

onUnmounted(() => {
  if (snackbarTimer) clearTimeout(snackbarTimer)
})

const closeTestDateDialog = () => {
  isTestDateDialogOpen.value = false
  activeTestDateRow.value = null
  pendingTestDateIso.value = ''
}

const openCncRegisterDialog = () => {
  if (!activeTestDateRow.value) return
  isCncRegisterDialogOpen.value = true
}

const handleCncButtonClick = () => {
  if (!activeTestDateRow.value || cncCancelSaving.value) return
  if (activeTestDateRow.value.has_cnc) {
    handleCncCancel()
    return
  }
  openCncRegisterDialog()
}

const handleCncCancel = () => {
  if (!activeTestDateRow.value || cncCancelSaving.value) return
  cncCancelSaving.value = true
  emit('cancel-cnc', {
    row: activeTestDateRow.value,
    onResult: (result) => {
      cncCancelSaving.value = false
      if (!result?.ok) {
        showSnackbar('CNC 취소에 실패했습니다.')
        return
      }
      activeTestDateRow.value = {
        ...activeTestDateRow.value,
        has_cnc: false,
      }
      showSnackbar('CNC 등록이 취소되었습니다.')
    },
  })
}

const closeCncRegisterDialog = () => {
  if (cncRegisterSaving.value) return
  isCncRegisterDialogOpen.value = false
}

const handleCncRegisterSubmit = ({ kind, quantity, length }) => {
  if (!activeTestDateRow.value) return
  cncRegisterSaving.value = true
  emit('register-cnc', {
    row: activeTestDateRow.value,
    kind,
    quantity,
    length,
    onResult: (result) => {
      cncRegisterSaving.value = false
      if (result?.ok) {
        isCncRegisterDialogOpen.value = false
        activeTestDateRow.value = {
          ...activeTestDateRow.value,
          has_cnc: true,
        }
        showSnackbar('CNC 등록되었습니다.')
        return
      }
      showSnackbar('CNC 등록에 실패했습니다.')
    },
  })
}

const openWeldingScheduleDateDialog = () => {
  if (!activeWeldingScheduleRow.value) return
  const baseIso = String(activeWeldingScheduleRow.value?.welding_schedule_date ?? '').trim() || formatIsoDate(new Date())
  weldingScheduleDateIso.value = baseIso
  const baseDate = parseIsoDate(baseIso) ?? new Date()
  weldingScheduleCalendarMonth.value = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  isWeldingScheduleDateDialogOpen.value = true
}

const openWeldingScheduleInspectorDialog = () => {
  if (!props.canManageWeldingSchedule) {
    showSnackbar(WELDING_SCHEDULE_PERMISSION_ERROR)
    return
  }
  if (!activeTestDateRow.value) return
  activeWeldingScheduleRow.value = activeTestDateRow.value
  selectedWeldingScheduleInspector.value = String(activeTestDateRow.value?.welding_schedule_inspector ?? '').trim()
  isWeldingScheduleInspectorDialogOpen.value = true
}

const closeWeldingScheduleInspectorDialog = () => {
  isWeldingScheduleInspectorDialogOpen.value = false
  if (!isWeldingScheduleDateDialogOpen.value) {
    activeWeldingScheduleRow.value = null
    selectedWeldingScheduleInspector.value = ''
  }
}

const selectWeldingScheduleInspector = (inspector) => {
  selectedWeldingScheduleInspector.value = inspector
  isWeldingScheduleInspectorDialogOpen.value = false
  openWeldingScheduleDateDialog()
}

const closeWeldingScheduleDateDialog = () => {
  isWeldingScheduleDateDialogOpen.value = false
  activeWeldingScheduleRow.value = null
  weldingScheduleDateIso.value = ''
  selectedWeldingScheduleInspector.value = ''
}

const moveWeldingScheduleCalendarMonth = (delta) => {
  const base = weldingScheduleCalendarMonth.value
  weldingScheduleCalendarMonth.value = new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

const selectWeldingScheduleDate = (day) => {
  if (!activeWeldingScheduleRow.value || !day?.key) return
  weldingScheduleDateIso.value = day.key
  emit('add-welding-schedule', {
    row: activeWeldingScheduleRow.value,
    scheduleDateIso: day.key,
    inspector: selectedWeldingScheduleInspector.value,
    onResult: (result) => {
      if (!result?.ok) {
        showSnackbar('용접일정 추가에 실패했습니다.')
        return
      }
      activeWeldingScheduleRow.value = {
        ...activeWeldingScheduleRow.value,
        welding_schedule_date: day.key,
        welding_schedule_inspector: selectedWeldingScheduleInspector.value,
      }
      showSnackbar(`${formatKoreanDateLabel(day.key)} 용접일정에 추가했습니다.`)
      closeWeldingScheduleDateDialog()
      closeWeldingScheduleInspectorDialog()
      closeTestDateDialog()
    },
  })
}

const removeWeldingSchedule = () => {
  if (!props.canManageWeldingSchedule) {
    showSnackbar(WELDING_SCHEDULE_PERMISSION_ERROR)
    return
  }
  if (!activeTestDateRow.value) return
  emit('remove-welding-schedule', {
    row: activeTestDateRow.value,
    onResult: (result) => {
      if (!result?.ok) {
        showSnackbar('용접일정 삭제에 실패했습니다.')
        return
      }
      activeTestDateRow.value = {
        ...activeTestDateRow.value,
        welding_schedule_date: null,
        welding_schedule_inspector: '',
      }
      showSnackbar('용접일정을 삭제했습니다.')
      closeWeldingScheduleDateDialog()
      closeWeldingScheduleInspectorDialog()
      closeTestDateDialog()
    },
  })
}

const shiftPendingTestDate = (deltaDays) => {
  const base = parseIsoDate(pendingTestDateIso.value) ?? parseIsoDate(props.selectedTuesdayIso) ?? new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + deltaDays)
  pendingTestDateIso.value = formatIsoDate(base)
}

const confirmTestDateMove = () => {
  if (!activeTestDateRow.value || !pendingTestDateIso.value) return
  emit('move-test-date', {
    row: activeTestDateRow.value,
    nextDateIso: pendingTestDateIso.value,
  })
  closeTestDateDialog()
}

const closeDrawingDialog = () => {
  if (drawingUploading.value || drawingDeletingId.value) return
  clearDrawingLongPressTimer()
  isDrawingDialogOpen.value = false
  drawingLoading.value = false
  drawingError.value = ''
  drawingUploadError.value = ''
  drawingUploading.value = false
  drawingDeletingId.value = null
  suppressDrawingClickId.value = null
  drawingFiles.value = []
  selectedDrawingUrl.value = ''
  activeDrawingRow.value = null
}

const openDrawingFilePicker = () => {
  if (drawingUploading.value) return
  drawingFileInput.value?.click()
}

const handleDrawingFileChange = (event) => {
  drawingUploadError.value = ''
  if (!activeDrawingRow.value?.id) return
  const selectedFiles = Array.from(event.target?.files ?? []).filter((file) => file instanceof File)
  if (selectedFiles.length === 0) {
    return
  }

  drawingUploading.value = true
  emit('upload-drawing-files', {
    rowId: activeDrawingRow.value.id,
    files: selectedFiles,
    onResult: (result) => {
      drawingUploading.value = false
      if (event?.target) event.target.value = ''
      if (!result?.ok) {
        drawingUploadError.value = '도면 등록 실패'
        return
      }

      const nextFiles = [...(result.files ?? []), ...drawingFiles.value]
      drawingFiles.value = nextFiles
      if (!selectedDrawingUrl.value) {
        const firstFile = nextFiles.find((item) => String(item?.viewUrl ?? '').trim())
        selectedDrawingUrl.value = firstFile?.viewUrl ?? ''
      }
    },
  })
}

const clearDrawingLongPressTimer = () => {
  if (drawingLongPressTimer) {
    clearTimeout(drawingLongPressTimer)
    drawingLongPressTimer = null
  }
}

const handleDrawingItemPressStart = (file) => {
  if (!file?.id || drawingDeletingId.value) return
  clearDrawingLongPressTimer()
  drawingLongPressTimer = setTimeout(async () => {
    suppressDrawingClickId.value = file.id
    if (!await confirm('삭제하시겠습니까?')) return

    drawingDeletingId.value = file.id
    drawingUploadError.value = ''
    emit('delete-drawing-file', {
      fileId: file.id,
      onResult: (result) => {
        drawingDeletingId.value = null
        if (!result?.ok) {
          drawingUploadError.value = '도면 삭제 실패'
          return
        }
        drawingFiles.value = drawingFiles.value.filter((item) => item.id !== file.id)
        if (selectedDrawingUrl.value === file.viewUrl) {
          const firstFile = drawingFiles.value.find((item) => String(item?.viewUrl ?? '').trim())
          selectedDrawingUrl.value = firstFile?.viewUrl ?? ''
        }
      },
    })
  }, DRAWING_LONG_PRESS_MS)
}

const handleDrawingItemPressEnd = () => {
  clearDrawingLongPressTimer()
}

const openPrintSettings = () => {
  isPrintSettingsOpen.value = true
}

const printProductionPlan = async (options = {}) => {
  isPrintSettingsOpen.value = false
  await printCurrentPage(isPrinting, options, { margin: '6mm' })
}

const selectDrawingFile = (file) => {
  if (!file?.viewUrl) return
  if (suppressDrawingClickId.value === file.id) {
    suppressDrawingClickId.value = null
    return
  }
  selectedDrawingUrl.value = file.viewUrl
}

</script>

<template>
  <section class="min-h-screen bg-white">
    <main class="w-full px-4 pb-5 md:px-6 md:pb-8">
      <div class="print-title-bar sticky top-[56px] z-20 -mx-4 border-b border-slate-200 bg-white px-4 py-2 md:top-[72px] md:-mx-6 md:px-6">
      <div class="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
          <div class="min-w-0">
            <div class="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-3">
              <h1 class="shrink-0 text-lg font-extrabold text-slate-900 md:text-xl">{{ pageTitle }}</h1>
              <div class="hidden flex-wrap items-center gap-1.5 md:flex">
                <span
                  v-for="badge in headerLegendBadges"
                  :key="badge.label"
                  class="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
                  :class="badge.className"
                >
                  {{ badge.label }}
                </span>
              </div>
            </div>
          </div>
          <div class="print-hide flex flex-col gap-2 xl:min-w-[520px] xl:flex-row xl:items-center xl:justify-end">
            <div class="flex flex-wrap items-center gap-2 xl:justify-end">
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" @click="emit('move-week', -1)">지난주</Button>
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" :disabled="weekOffset === 0" @click="emit('reset-week')">
                이번주
              </Button>
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" @click="emit('move-week', 1)">다음주</Button>
              <Button class="h-8 bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800 md:text-sm" @click="emit('go-register')">
                등록
              </Button>
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" :disabled="isPrinting" @click="openPrintSettings">
                <Printer class="mr-1 h-4 w-4" />
                인쇄
              </Button>
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" @click="emit('go-cnc')">
                CNC
              </Button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="검수일자 선택"
                @click="openCalendarDialog"
              >
                <CalendarDays class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="주간 작업일지"
                @click="emit('go-stats')"
              >
                <ClipboardList class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 xl:hidden"
                :class="hasActiveSearch || searchAllDates ? 'border-blue-200 bg-blue-50 text-blue-700' : ''"
                aria-label="검색"
                @click="openSearchDialog"
              >
                <Search class="h-4 w-4" />
              </button>
            </div>
            <div class="hidden items-center gap-2 xl:flex">
              <div class="relative min-w-0 flex-1 xl:w-[160px] xl:flex-none">
                <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400" stroke-width="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <Input
                  class="h-8 border-slate-200 pl-9 pr-3 text-xs md:text-sm"
                  :model-value="localSearchText"
                  :placeholder="searchPlaceholder"
                  @update:model-value="handleSearchInput"
                  @keydown.enter="submitSearch"
                />
              </div>
              <label class="print-hide inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 md:text-sm">
                <input
                  :checked="localSearchAllDates"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  @change="handleSearchAllDatesChange"
                />
                <span>전체</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="isCalendarDialogOpen"
        class="print-hide fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
        @click.self="closeCalendarDialog"
      >
        <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-extrabold text-slate-900">검수일자 선택</h2>
            </div>
            <button type="button" class="text-slate-400 hover:text-slate-600" @click="closeCalendarDialog">닫기</button>
          </div>

          <div class="mt-4">
            <div class="mb-3 flex items-center justify-between">
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                @click="moveCalendarMonth(-1)"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <p class="text-sm font-extrabold text-slate-900">{{ calendarMonthLabel }}</p>
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                @click="moveCalendarMonth(1)"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-7 gap-1">
              <div
                v-for="label in calendarWeekLabels"
                :key="label"
                class="flex h-8 items-center justify-center text-xs font-bold text-slate-500"
              >
                {{ label }}
              </div>
              <button
                v-for="day in calendarWeeks.flat()"
                :key="day.key"
                type="button"
                class="flex h-11 items-center justify-center rounded-lg border text-sm transition"
                :class="[
                  day.isTuesday
                    ? day.isSelected
                      ? 'border-slate-900 bg-slate-900 font-extrabold text-white'
                      : 'border-blue-200 bg-blue-50 font-bold text-blue-700 hover:bg-blue-100'
                    : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300',
                  !day.isCurrentMonth && day.isTuesday ? 'opacity-45' : '',
                ]"
                :disabled="!day.isTuesday"
                @click="selectCalendarDate(day)"
              >
                {{ day.label }}
              </button>
            </div>

            <p class="mt-3 text-xs" :class="isCalendarTuesday ? 'text-slate-500' : 'font-bold text-red-600'">
              {{ isCalendarTuesday ? '파란색 화요일만 선택할 수 있습니다.' : '화요일 날짜만 선택해주세요.' }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="isSearchDialogOpen"
        class="print-hide fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
        @click.self="closeSearchDialog"
      >
        <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-base font-extrabold text-slate-900">검색</h2>
            <button type="button" class="text-sm text-slate-500 hover:text-slate-700" @click="closeSearchDialog">닫기</button>
          </div>
          <div class="mt-4 space-y-3">
            <Input
              class="h-11 w-1/2 border-slate-200 text-sm"
              :model-value="localSearchText"
              :placeholder="searchPlaceholder"
              autofocus
              @update:model-value="handleSearchInput"
              @keydown.enter="submitSearch"
            />
            <label class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              <input
                :checked="localSearchAllDates"
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                @change="localSearchAllDates = Boolean($event?.target?.checked)"
              />
              <span>전체</span>
            </label>
          </div>
          <div class="mt-5 flex gap-2">
            <Button class="h-10 flex-1 text-sm" variant="outline" @click="closeSearchDialog">취소</Button>
            <Button class="h-10 flex-1 text-sm" @click="submitSearch">검색</Button>
          </div>
        </div>
      </div>

      <div v-if="planLoading" class="py-16 text-center text-sm text-slate-500">데이터 로딩 중...</div>
      <div v-else-if="planError" class="py-16 text-center text-sm text-red-600">{{ planError }}</div>
      <div v-else-if="hasActiveSearch && visibleGroups.length === 0" class="py-16 text-center text-sm text-slate-500">검색 결과가 없습니다.</div>
      <div v-else class="production-plan-groups-scroll mt-6 space-y-6">
        <MainProductionPlanGroupTable
          v-for="(groupData, groupIndex) in visibleGroups"
          :key="groupData.group"
          :group-data="groupData"
          :group-index="groupIndex"
          :overall-totals="overallTotals"
          :show-full-dates="searchAllDates"
          @cell-click="handleCellClick"
          @cell-long-press="handleCellLongPress"
          @open-row-menu="openRowMenu"
        />
      </div>
    </main>


    <div
      v-if="isInchDialogOpen && activeInchRow"
      class="print-hide fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
    >
      <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h3 class="text-base font-extrabold text-slate-900">인치 입력</h3>
            <p class="mt-2 truncate text-sm font-semibold text-slate-700">
              {{ activeInchRow.company || '-' }} / {{ activeInchRow.place || '-' }}
            </p>
            <p class="truncate text-sm text-slate-500">{{ activeInchRow.area || '-' }}</p>
          </div>
          <button type="button" class="text-sm text-slate-500 hover:text-slate-700" @click="closeInchDialog">닫기</button>
        </div>

        <div class="mt-5">
          <p class="mb-2 text-sm font-bold text-slate-700">인치</p>
          <Input
            class="h-11"
            :model-value="inchInput"
            inputmode="decimal"
            placeholder="숫자 입력"
            autofocus
            @keydown="handleInchKeydown"
            @update:model-value="handleInchInput"
          />
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <Button class="h-10 px-4 text-sm" variant="outline" @click="closeInchDialog">닫기</Button>
          <Button class="h-10 px-4 text-sm" @click="confirmInch">{{ inchSubmitLabel }}</Button>
        </div>
      </div>
    </div>

    <div
      v-if="isTestDateDialogOpen && activeTestDateRow"
      class="print-hide fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
      @click.self="closeTestDateDialog"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <p class="text-[15px] font-extrabold text-slate-900">{{ activeTestDateRow.company || '-' }}</p>
        <p class="mt-1 text-sm font-semibold text-slate-700">{{ activeTestDateRow.place || '-' }}</p>
        <p class="text-sm text-slate-600">{{ activeTestDateRow.area || '-' }}</p>
        <p class="mt-6 text-[18px] font-bold text-slate-800">
          {{ pendingTestDateLabel }}
          <span class="text-orange-500"> 검수로 이동</span>
        </p>
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-md bg-sky-500 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-600"
            @click="shiftPendingTestDate(-7)"
          >
            지난주
          </button>
          <button
            type="button"
            class="rounded-md bg-sky-500 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-600"
            @click="shiftPendingTestDate(7)"
          >
            다음주
          </button>
          <button
            type="button"
            class="rounded-md bg-orange-500 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
            @click="confirmTestDateMove"
          >
            이동
          </button>
          <button
            type="button"
            class="rounded-md px-5 py-2 text-sm font-bold shadow-sm transition disabled:opacity-60"
            :class="
              activeTestDateRow.has_cnc
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            "
            :disabled="cncCancelSaving"
            @click="handleCncButtonClick"
          >
            {{ cncCancelSaving ? '처리 중...' : activeTestDateRow.has_cnc ? 'CNC취소' : 'CNC' }}
          </button>
          <button
            v-if="canManageWeldingSchedule"
            type="button"
            class="rounded-md px-5 py-2 text-sm font-bold shadow-sm transition"
            :class="
              activeTestDateRow.welding_schedule_date
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            "
            @click="activeTestDateRow.welding_schedule_date ? removeWeldingSchedule() : openWeldingScheduleInspectorDialog()"
          >
            {{ activeTestDateRow.welding_schedule_date ? '용접일정삭제' : '용접일정추가' }}
          </button>
        </div>
      </div>
    </div>

    <CncPlanRegisterDialog
      :open="isCncRegisterDialogOpen && Boolean(activeTestDateRow)"
      :saving="cncRegisterSaving"
      :company="String(activeTestDateRow?.company ?? '')"
      :place="String(activeTestDateRow?.place ?? '')"
      :area="String(activeTestDateRow?.area ?? '')"
      :drawing-no="String(activeTestDateRow?.initial ?? '')"
      @close="closeCncRegisterDialog"
      @submit="handleCncRegisterSubmit"
    />

    <div
      v-if="isWeldingScheduleInspectorDialogOpen && activeWeldingScheduleRow"
      class="print-hide fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4"
    >
      <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-base font-extrabold text-slate-900">용접사 선택</h3>
            <p class="mt-2 truncate text-sm font-semibold text-slate-700">
              {{ activeWeldingScheduleRow.company || '-' }} / {{ activeWeldingScheduleRow.place || '-' }}
            </p>
            <p class="truncate text-sm text-slate-500">{{ activeWeldingScheduleRow.area || '-' }}</p>
          </div>
          <button type="button" class="shrink-0 text-sm text-slate-500 hover:text-slate-700" @click="closeWeldingScheduleInspectorDialog">
            닫기
          </button>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl border-2 border-cyan-300 bg-cyan-200 py-5 text-base font-extrabold text-cyan-950 transition active:scale-[0.98]"
            @click="selectWeldingScheduleInspector('민뚜라')"
          >
            민뚜라
          </button>
          <button
            type="button"
            class="rounded-xl border-2 border-fuchsia-300 bg-fuchsia-200 py-5 text-base font-extrabold text-fuchsia-950 transition active:scale-[0.98]"
            @click="selectWeldingScheduleInspector('진민택')"
          >
            진민택
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isWeldingScheduleDateDialogOpen && activeWeldingScheduleRow"
      class="print-hide fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-base font-extrabold text-slate-900">용접일정 날짜 선택</h3>
            <p class="mt-2 truncate text-sm font-semibold text-slate-700">
              {{ activeWeldingScheduleRow.company || '-' }} / {{ activeWeldingScheduleRow.place || '-' }}
            </p>
            <p class="truncate text-sm text-slate-500">{{ activeWeldingScheduleRow.area || '-' }}</p>
          </div>
          <button type="button" class="shrink-0 text-sm text-slate-500 hover:text-slate-700" @click="closeWeldingScheduleDateDialog">
            닫기
          </button>
        </div>

        <p class="mt-5 text-sm font-bold text-slate-700">
          선택일: <span class="text-slate-950">{{ weldingScheduleDateLabel }}</span>
        </p>

        <div class="mt-4">
          <div class="mb-3 flex items-center justify-between">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              @click="moveWeldingScheduleCalendarMonth(-1)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <p class="text-sm font-extrabold text-slate-900">{{ weldingScheduleCalendarMonthLabel }}</p>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              @click="moveWeldingScheduleCalendarMonth(1)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-7 gap-1">
            <div
              v-for="label in calendarWeekLabels"
              :key="`welding-schedule-${label}`"
              class="flex h-8 items-center justify-center text-xs font-bold text-slate-500"
            >
              {{ label }}
            </div>
            <button
              v-for="day in weldingScheduleCalendarWeeks.flat()"
              :key="`welding-schedule-${day.key}`"
              type="button"
              class="flex h-11 items-center justify-center rounded-lg border text-sm font-bold transition"
              :class="[
                day.isSelected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                !day.isCurrentMonth ? 'opacity-40' : '',
              ]"
              @click="selectWeldingScheduleDate(day)"
            >
              {{ day.label }}
            </button>
          </div>

        </div>
      </div>
    </div>

    <div
      v-if="isDrawingDialogOpen"
      class="print-hide fixed inset-0 z-[60] bg-slate-900/60"
      @click.self="closeDrawingDialog"
    >
      <div class="flex h-[100dvh] w-screen flex-col gap-0 overflow-hidden bg-white md:grid md:h-screen md:grid-cols-[320px_1fr]">
        <div class="shrink-0 border-b border-slate-200 bg-white p-4 md:border-b-0 md:border-r">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="text-base font-extrabold text-slate-900">도면 목록</h3>
              <p class="mt-2 truncate text-sm font-semibold text-slate-900">{{ activeDrawingRow?.company || '-' }}</p>
              <p class="truncate text-sm text-slate-600">{{ activeDrawingRow?.place || '-' }}</p>
              <p class="truncate text-sm text-slate-500">{{ activeDrawingRow?.area || '-' }}</p>
            </div>
            <button type="button" class="shrink-0 text-sm text-slate-500 hover:text-slate-700" @click="closeDrawingDialog">닫기</button>
          </div>
          <div class="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="mb-2 text-xs font-bold text-slate-600">도면 등록</p>
            <input
              ref="drawingFileInput"
              type="file"
              multiple
              accept=".pdf,image/*"
              class="hidden"
              @change="handleDrawingFileChange"
            />
            <p v-if="drawingUploadError" class="mt-2 text-xs font-bold text-red-600">{{ drawingUploadError }}</p>
            <Button class="mt-3 h-9 w-full text-sm" :disabled="drawingUploading" @click="openDrawingFilePicker">
              {{ drawingUploading ? '등록 중...' : '도면 등록' }}
            </Button>
          </div>
          <div class="max-h-[28dvh] space-y-2 overflow-y-auto md:max-h-[calc(100vh-220px)]">
            <div v-if="drawingLoading" class="rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">도면 조회 중...</div>
            <div v-else-if="drawingError" class="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-600">{{ drawingError }}</div>
            <div v-else-if="drawingFiles.length === 0" class="rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">등록된 도면이 없습니다.</div>
            <button
              v-for="file in drawingFiles"
              :key="file.id"
              type="button"
              class="w-full rounded-xl border px-3 py-2 text-left text-sm"
              :class="selectedDrawingUrl === file.viewUrl ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
              @mousedown="handleDrawingItemPressStart(file)"
              @mouseup="handleDrawingItemPressEnd"
              @mouseleave="handleDrawingItemPressEnd"
              @touchstart="handleDrawingItemPressStart(file)"
              @touchend="handleDrawingItemPressEnd"
              @touchcancel="handleDrawingItemPressEnd"
              @click="selectDrawingFile(file)"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="truncate font-semibold">{{ file.name }}</p>
                <span
                  v-if="drawingDeletingId === file.id"
                  class="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700"
                >
                  삭제 중...
                </span>
              </div>
              <p class="mt-1 truncate text-xs text-slate-500">{{ file.rawPath || file.viewUrl || '' }}</p>
            </button>
          </div>
        </div>
        <div class="min-h-0 flex-1 bg-slate-50 md:h-full">
          <iframe v-if="selectedDrawingUrl" :src="selectedDrawingUrl" class="h-full w-full" title="drawing-viewer" />
          <div v-else class="flex h-full items-center justify-center text-sm text-slate-500">미리볼 도면을 선택해주세요.</div>
        </div>
      </div>
    </div>

    <div
      v-if="isRowDialogOpen && activeDialogRow"
      class="print-hide fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6"
      @click.self="closeRowDialog"
    >
      <div class="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="truncate text-lg font-bold text-slate-900">{{ activeDialogRow.company || '-' }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ activeDialogRow.place || '-' }}</p>
            <p class="text-sm text-slate-500">{{ activeDialogRow.area || '-' }}</p>
          </div>
          <button type="button" class="text-sm text-slate-500 hover:text-slate-700" @click="closeRowDialog">닫기</button>
        </div>

        <div class="mt-4 grid gap-2 text-sm md:grid-cols-3">
          <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p class="text-xs text-slate-500">배포일</p>
            <p class="mt-1 font-semibold text-slate-900">{{ formatDrawingDate(activeDialogRow.drawing_date) || '-' }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p class="text-xs text-slate-500">도착일</p>
            <p class="mt-1 font-semibold text-slate-900">{{ activeDialogRow.delivery_due_date || '-' }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p class="text-xs text-slate-500">상태</p>
            <p class="mt-1 font-semibold text-slate-900">
              {{ activeDialogRow.not_test ? '비검수' : '검수' }} / {{ activeDialogRow.hold ? '보류중' : '진행중' }}
            </p>
          </div>
        </div>

        <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">비고</p>
          <p class="mt-2 whitespace-pre-wrap text-sm text-slate-700">{{ activeDialogRow.memo || '' }}</p>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <Button class="h-9 px-4 text-sm" variant="outline" @click="handleEditRow">수정</Button>
          <Button class="h-9 px-4 text-sm" variant="outline" @click="handleToggleInspection">{{ inspectionActionLabel }}</Button>
          <Button class="h-9 px-4 text-sm" variant="outline" @click="handleToggleHold">{{ holdActionLabel }}</Button>
          <Button class="h-9 px-4 text-sm text-rose-600 hover:bg-rose-50" variant="outline" @click="openDeleteConfirm">삭제</Button>
        </div>
      </div>
    </div>

    <div
      v-if="isDeleteConfirmOpen && activeDialogRow"
      class="print-hide fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4"
      @click.self="closeDeleteConfirm"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 class="text-lg font-bold text-slate-900">정말 삭제할까요?</h3>
        <p class="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {{ activeDialogRow.company || '-' }} / {{ activeDialogRow.place || '-' }} / {{ activeDialogRow.area || '-' }}
        </p>
        <p class="mt-2 text-sm text-slate-500">삭제 후에는 목록에서 바로 사라집니다.</p>

        <div class="mt-6 flex justify-end gap-2">
          <Button class="h-10 px-4 text-sm" variant="outline" @click="closeDeleteConfirm">취소</Button>
          <Button class="h-10 bg-rose-600 px-4 text-sm text-white hover:bg-rose-700" @click="handleDeleteRow">삭제</Button>
        </div>
      </div>
    </div>

    <div
      v-if="isShipmentConfirmOpen && activeShipmentRow"
      class="print-hide fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4"
      @click.self="closeShipmentConfirm"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 class="text-lg font-bold text-slate-900">{{ shipmentMode === 'cancel' ? '출하완료 취소' : '출하완료 처리' }}</h3>
        <p class="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {{ activeShipmentRow.company || '-' }} / {{ activeShipmentRow.place || '-' }}
        </p>
        <p class="text-sm text-slate-500">{{ activeShipmentRow.area || '-' }}</p>
        <div class="mt-5 rounded-2xl border px-4 py-4 text-center" :class="activeShipmentWorkerClass">
          <p class="text-xs font-extrabold">용접 작업자</p>
          <p class="mt-1 text-3xl font-black leading-none">{{ activeShipmentWorkerName }}</p>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <Button class="h-10 px-4 text-sm" variant="outline" @click="closeShipmentConfirm">취소</Button>
          <Button
            class="h-10 px-4 text-sm text-white"
            :class="shipmentMode === 'cancel' ? 'bg-slate-600 hover:bg-slate-700' : 'bg-red-500 hover:bg-red-600'"
            @click="handleConfirmShipment"
          >
            {{ shipmentMode === 'cancel' ? '출하완료 취소' : '출하완료' }}
          </Button>
        </div>
      </div>
    </div>

    <div
      v-if="isWeldingInspectorDialogOpen"
      class="print-hide fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4"
      @click.self="closeWeldingInspectorDialog"
    >
      <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 class="text-base font-extrabold text-slate-900">용접 작업자 선택</h3>
        <p v-if="weldingInspectorDialogRow" class="mt-3 truncate text-sm font-semibold text-slate-700">
          {{ weldingInspectorDialogRow.company || '-' }} / {{ weldingInspectorDialogRow.place || '-' }}
        </p>
        <p v-if="weldingInspectorDialogRow" class="truncate text-sm text-slate-500">
          {{ weldingInspectorDialogRow.area || '-' }}
        </p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button
            v-for="inspector in WELDING_INSPECTORS"
            :key="inspector"
            type="button"
            class="rounded-xl border-2 py-4 text-base font-extrabold transition active:scale-[0.98]"
            :class="getWeldingInspectorClass(inspector)"
            @click="selectWeldingInspector(inspector)"
          >
            {{ inspector }}
          </button>
        </div>
        <button
          type="button"
          class="mt-4 w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-500 hover:bg-slate-50"
          @click="closeWeldingInspectorDialog"
        >
          취소
        </button>
      </div>
    </div>

    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="snackbarVisible"
        class="print-hide fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        {{ snackbarMessage }}
      </div>
    </transition>

    <PrintSettingsDialog
      :open="isPrintSettingsOpen"
      @close="isPrintSettingsOpen = false"
      @print="printProductionPlan"
    />
  </section>
</template>

<style scoped>
@media print {
  .print-hide {
    display: none !important;
  }

  .print-title-bar {
    position: static !important;
    top: auto !important;
    margin: 0 0 12px 0 !important;
    padding: 0 0 12px 0 !important;
  }

  section,
  main {
    min-height: auto !important;
  }

  main {
    padding: 0 !important;
  }
}

.production-plan-groups-scroll {
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 768px) and (max-width: 1279px) {
  .production-plan-groups-scroll {
    margin-right: -1.5rem;
    margin-left: -1.5rem;
    overflow-x: auto;
    padding-right: 1.5rem;
    padding-left: 1.5rem;
    scrollbar-width: none;
  }

  .production-plan-groups-scroll::-webkit-scrollbar {
    display: none;
  }
}
</style>
