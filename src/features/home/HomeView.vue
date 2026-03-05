<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import { productTableColumns, tableTotalWidth } from '@/features/home/productTableConfig'

const props = defineProps({
  pageTitle: { type: String, required: true },
  realtimeConnected: { type: Boolean, default: false },
  weekOffset: { type: Number, default: 0 },
  planLoading: { type: Boolean, default: false },
  planError: { type: String, default: '' },
  searchText: { type: String, default: '' },
  searchAllDates: { type: Boolean, default: false },
  unreadNotificationCount: { type: Number, default: 0 },
  requestAlerts: { type: Array, default: () => [] },
  replyAlerts: { type: Array, default: () => [] },
  canReplyRequestAlert: { type: Function, default: () => false },
  groupedRows: { type: Array, default: () => [] },
  totals: { type: Object, required: true },
  scheduleSummary: { type: Object, required: true },
  profile: { type: Object, default: null },
  currentWorkMan: { type: String, default: '' },
})

const emit = defineEmits([
  'move-week',
  'reset-week',
  'go-my-page',
  'go-notifications',
  'go-stats',
  'toggle-work-status',
  'reorder-rows',
  'save-row-menu',
  'load-drawing-files',
  'search-change',
  'dismiss-reply-alert',
  'submit-request-alert-reply',
  'complete-request-alert',
])

const stageMeta = {
  marking_weld_a: { field: 'marking_weld_a_status', workMan: '마킹1' },
  marking_weld_b: { field: 'marking_weld_b_status', workMan: '마킹2' },
  marking_laser_1: { field: 'marking_laser_1_status', workMan: '레이저1' },
  marking_laser_2: { field: 'marking_laser_2_status', workMan: '레이저2' },
  nasa: { field: 'nasa_status', workMan: '무용접' },
  beveling: { field: 'beveling_status', workMan: '티&면치' },
  main_work: { field: 'main_status', workMan: '메인' },
}
const workManToStageKey = {
  마킹1: 'marking_weld_a',
  '마킹 1': 'marking_weld_a',
  마킹2: 'marking_weld_b',
  '마킹 2': 'marking_weld_b',
  레이저1: 'marking_laser_1',
  '레이저 1': 'marking_laser_1',
  레이저2: 'marking_laser_2',
  '레이저 2': 'marking_laser_2',
  무용접: 'nasa',
  무용접반: 'nasa',
  나사: 'nasa',
  '티&면치': 'beveling',
  메인: 'main_work',
  관리자: 'all',
  전체: 'all',
}
const snackMessage = ref('')
let snackTimer = null
const LONG_PRESS_REQUIRED_MS = 700
const pressStartedAt = ref({})
const longPressTimers = new Map()
const longPressTriggered = new Set()
const ignoreNextClick = new Set()
const draggedRowId = ref(null)
const isCallDialogOpen = ref(false)
const selectedCallType = ref('')
const callOptions = ['도면 없음', '증지 없음', '확인요망']
const activeCallRow = ref(null)
const delayTextInput = ref('')
const delayTimeInput = ref(0)
const isDrawingDialogOpen = ref(false)
const drawingFiles = ref([])
const drawingLoading = ref(false)
const drawingError = ref('')
const selectedDrawingUrl = ref('')
const drawingListCollapsed = ref(false)
const localSearchText = ref('')
const localSearchAllDates = ref(false)
const requestReplyDrafts = ref({})
const mobileEditModeByRow = ref({})

watch(
  () => [props.searchText, props.searchAllDates],
  ([text, allDates]) => {
    localSearchText.value = String(text ?? '')
    localSearchAllDates.value = Boolean(allDates)
  },
  { immediate: true },
)

const emitSearchChange = () => {
  emit('search-change', {
    text: localSearchText.value,
    allDates: localSearchAllDates.value,
  })
}

const getDrawingDistributionRate = () => {
  const distributed = Number(props.scheduleSummary?.distributedDrawingCount ?? 0)
  const planned = Number(props.scheduleSummary?.totalDrawingCount ?? 0)
  if (!Number.isFinite(distributed) || !Number.isFinite(planned) || planned <= 0) return 0
  const ratio = (distributed / planned) * 100
  return Math.min(100, Math.max(0, Math.round(ratio)))
}

const normalizeStageStatus = (value) => {
  const raw = String(value ?? '').trim()
  if (raw.includes('작업중')) return '작업중'
  if (raw.includes('작업완료')) return '작업완료'
  if (!raw || raw === '없음' || raw === '작업전') return '없음'
  return '없음'
}

const getCellText = (row, key) => {
  const stage = stageMeta[key]
  if (stage) {
    return normalizeStageStatus(row?.[stage.field])
  }
  if ((key === 'head' || key === 'hole') && Number(row?.[key] ?? 0) === 0) {
    return ''
  }
  return row?.[key] ?? ''
}

const normalizeWorkMan = (value) => String(value ?? '').replaceAll(' ', '').trim()
const normalizeWorkType = (value) => String(value ?? '').replaceAll(' ', '').trim()
const isAdminWorkMan = (value) => {
  const normalized = normalizeWorkMan(value)
  return normalized.includes(normalizeWorkMan('관리자')) || normalized.includes(normalizeWorkMan('전체'))
}
const canReorderRows = computed(() => isAdminWorkMan(props.currentWorkMan))
const isHoleBasedRow = (row) => {
  const workType = normalizeWorkType(row?.work_type)
  return workType.includes('전실/입상') || workType.includes('전실입상')
}
const mobileStageRows = [
  ['marking_weld_a', 'marking_weld_b', 'marking_laser_1', 'marking_laser_2'],
  ['beveling', 'main_work', 'nasa'],
]
const getPlanUnitLabel = (row) => (isHoleBasedRow(row) ? '홀' : '헤드')
const getPlanQty = (row) => {
  const key = isHoleBasedRow(row) ? 'hole' : 'head'
  const qty = Number(row?.[key] ?? 0)
  return Number.isFinite(qty) ? qty : 0
}
const formatKoreanDateText = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'

  const matched = raw.match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/)
  if (!matched) return raw

  const [, y, m, d] = matched
  return `${y}년 ${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일`
}

const resolveStageKeyFromWorkMan = (currentWorkMan) => {
  const normalized = normalizeWorkMan(currentWorkMan)
  if (!normalized || normalized === '없음') return null
  for (const [workMan, stageKey] of Object.entries(workManToStageKey)) {
    if (normalized.includes(normalizeWorkMan(workMan))) return stageKey
  }
  return null
}

const canControlStageByWorkMan = (currentWorkMan, stageKey) => {
  const resolved = resolveStageKeyFromWorkMan(currentWorkMan)
  if (!resolved) return false
  if (resolved === 'all') return true
  return resolved === stageKey
}

const showSnack = (message) => {
  snackMessage.value = message
  if (snackTimer) {
    clearTimeout(snackTimer)
  }
  snackTimer = setTimeout(() => {
    snackMessage.value = ''
  }, 1800)
}

const isMobileRowEditing = (rowId) => Boolean(mobileEditModeByRow.value[rowId])
const toggleMobileRowEdit = (rowId) => {
  if (!canReorderRows.value) {
    showSnack('관리자만 수정할 수 있습니다')
    return
  }
  mobileEditModeByRow.value[rowId] = !isMobileRowEditing(rowId)
}
const ensureMobileRowEditable = (rowId) => {
  if (!canReorderRows.value) {
    showSnack('관리자만 수정할 수 있습니다')
    return false
  }
  if (!isMobileRowEditing(rowId)) {
    return false
  }
  return true
}

const isActualDistributedRow = (row) => String(row?.drawing_date ?? '').trim().length > 0
const isVirtualDistributedRow = (row) =>
  !isActualDistributedRow(row) && Boolean(row?.virtual_drawing_distributed)
const isRowDisabled = (row) => !isActualDistributedRow(row) && !isVirtualDistributedRow(row)
const isDistributedRow = (row) => isActualDistributedRow(row) || isVirtualDistributedRow(row)

const isRowCompleted = (row) =>
  isDistributedRow(row) &&
  Object.values(stageMeta).every((meta) => {
    const raw = String(row?.[meta.field] ?? '').trim()
    return raw === '없음' || raw.includes('작업완료')
  })

const isStageColumn = (key) => Object.hasOwn(stageMeta, key)
const isCallColumn = (key) => key === 'call_action'

const statusClass = (status) => {
  if (status === '작업중') return 'bg-green-100 text-green-800'
  if (status === '작업완료') return 'bg-red-100 text-red-800'
  if (status === '없음') return 'bg-transparent text-slate-500'
  return 'bg-white text-slate-700'
}

const getPressKey = (rowId, stageKey = 'row') => `${rowId}:${stageKey}`
const resolvePressMs = (pressKey) => {
  const started = pressStartedAt.value[pressKey]
  if (!started) return 0
  return Date.now() - started
}
const clearPressState = (pressKey) => {
  const timer = longPressTimers.get(pressKey)
  if (timer) {
    clearTimeout(timer)
    longPressTimers.delete(pressKey)
  }
  delete pressStartedAt.value[pressKey]
  longPressTriggered.delete(pressKey)
}
const consumeIgnoredClick = (pressKey) => {
  if (!ignoreNextClick.has(pressKey)) return false
  ignoreNextClick.delete(pressKey)
  return true
}
const emitToggleWorkStatus = (row, stageKey, longPressMs) => {
  emit('toggle-work-status', {
    rowId: row.id,
    stageKey,
    longPressMs,
    onResult: (result) => {
      if (!result?.ok && result?.reason === 'long_press_required') {
        showSnack('작업완료에서 작업전 변경은 롱클릭이 필요합니다')
        return
      }
      if (!result?.ok && result?.reason === 'unauthorized') {
        showSnack('권한이 없습니다.')
      }
    },
  })
}
const resolveRowStageKey = (currentWorkMan, { withSnack = true } = {}) => {
  const stageKey = resolveStageKeyFromWorkMan(currentWorkMan)
  if (!stageKey) {
    if (withSnack) showSnack('권한이 없습니다.')
    return null
  }
  if (stageKey === 'all') {
    if (withSnack) showSnack('관리자는 변경할 공정 칸을 눌러주세요')
    return null
  }
  return stageKey
}
const startLongPress = ({ row, stageKey, currentWorkMan }) => {
  if (isRowDisabled(row)) return
  const pressKey = getPressKey(row.id, stageKey)
  pressStartedAt.value[pressKey] = Date.now()
  clearPressState(pressKey)
  pressStartedAt.value[pressKey] = Date.now()
  const timer = setTimeout(() => {
    longPressTriggered.add(pressKey)
    ignoreNextClick.add(pressKey)
    if (stageKey === 'row') {
      const resolvedStageKey = resolveRowStageKey(currentWorkMan, { withSnack: false })
      if (!resolvedStageKey) return
      emitToggleWorkStatus(row, resolvedStageKey, LONG_PRESS_REQUIRED_MS)
      return
    }
    if (!canControlStageByWorkMan(currentWorkMan, stageKey)) return
    emitToggleWorkStatus(row, stageKey, LONG_PRESS_REQUIRED_MS)
  }, LONG_PRESS_REQUIRED_MS)
  longPressTimers.set(pressKey, timer)
}
const endLongPress = (rowId, stageKey = 'row') => {
  const pressKey = getPressKey(rowId, stageKey)
  clearPressState(pressKey)
}
const handleRowPressStart = (row, currentWorkMan) => {
  startLongPress({ row, stageKey: 'row', currentWorkMan })
}
const handleStagePressStart = (row, stageKey, currentWorkMan) => {
  startLongPress({ row, stageKey, currentWorkMan })
}
const handleMobileStagePressStart = (row, stageKey, currentWorkMan) => {
  if (!ensureMobileRowEditable(row.id)) return
  handleStagePressStart(row, stageKey, currentWorkMan)
}
const handleMobileStageClick = (row, stageKey, currentWorkMan) => {
  if (!ensureMobileRowEditable(row.id)) return
  handleStageClick(row, stageKey, currentWorkMan)
}

const handleRowClick = (row, currentWorkMan) => {
  if (isRowDisabled(row)) {
    showSnack('도면 배포전 입니다')
    return
  }

  const stageKey = resolveRowStageKey(currentWorkMan)
  if (!stageKey) return

  const pressKey = getPressKey(row.id, 'row')
  if (consumeIgnoredClick(pressKey)) return
  const pressMs = resolvePressMs(pressKey)
  clearPressState(pressKey)
  emitToggleWorkStatus(row, stageKey, pressMs)
}

const handleStageClick = (row, stageKey, currentWorkMan) => {
  if (isRowDisabled(row)) {
    showSnack('도면 배포전 입니다')
    return
  }

  if (!canControlStageByWorkMan(currentWorkMan, stageKey)) {
    showSnack('권한이 없습니다.')
    return
  }

  const pressKey = getPressKey(row.id, stageKey)
  if (consumeIgnoredClick(pressKey)) return
  const pressMs = resolvePressMs(pressKey)
  clearPressState(pressKey)
  emitToggleWorkStatus(row, stageKey, pressMs)
}

const handleDragStart = (event, rowId) => {
  if (!canReorderRows.value) {
    event.preventDefault()
    return
  }
  draggedRowId.value = rowId
}

const handleDragOver = (event) => {
  if (!canReorderRows.value) return
  event.preventDefault()
}

const handleDrop = (targetRowId) => {
  if (!canReorderRows.value) {
    draggedRowId.value = null
    showSnack('관리자만 행 순서를 변경할 수 있습니다')
    return
  }
  if (!draggedRowId.value || draggedRowId.value === targetRowId) return
  emit('reorder-rows', {
    sourceRowId: draggedRowId.value,
    targetRowId: targetRowId,
    onResult: (result) => {
      if (!result?.ok && result?.reason === 'cross_group_not_allowed') {
        showSnack('같은 작업유형 내에서만 순서를 변경할 수 있습니다')
        return
      }
      if (!result?.ok && result?.reason === 'unauthorized') {
        showSnack('관리자만 행 순서를 변경할 수 있습니다')
      }
    },
  })
  draggedRowId.value = null
}

const openCallDialog = (row) => {
  activeCallRow.value = row
  selectedCallType.value = ''
  delayTextInput.value = String(row?.delay_text ?? '')
  const delaySec = Math.max(0, Number(row?.delay_time) || 0)
  delayTimeInput.value = Math.round(delaySec / 60)
  isCallDialogOpen.value = true
}

const openDrawingDialog = (row) => {
  isDrawingDialogOpen.value = true
  drawingLoading.value = true
  drawingError.value = ''
  drawingFiles.value = []
  selectedDrawingUrl.value = ''

  emit('load-drawing-files', {
    rowId: row?.id,
    onResult: (result) => {
      drawingLoading.value = false
      if (!result?.ok) {
        drawingError.value = '도면 조회 실패'
        return
      }
      drawingFiles.value = result.files ?? []
      const firstWithUrl = drawingFiles.value.find((f) => String(f?.viewUrl ?? '').trim())
      selectedDrawingUrl.value = firstWithUrl?.viewUrl ?? ''
    },
  })
}

const openDrawingFromMenu = () => {
  const row = activeCallRow.value
  closeCallDialog()
  if (!row) return
  openDrawingDialog(row)
}

const closeCallDialog = () => {
  isCallDialogOpen.value = false
  activeCallRow.value = null
  delayTextInput.value = ''
  delayTimeInput.value = 0
}

const closeDrawingDialog = () => {
  isDrawingDialogOpen.value = false
  drawingLoading.value = false
  drawingError.value = ''
  drawingFiles.value = []
  selectedDrawingUrl.value = ''
  drawingListCollapsed.value = false
}

const confirmCallDialog = () => {
  emit('save-row-menu', {
    rowId: activeCallRow.value?.id,
    delayText: delayTextInput.value,
    delayTime: delayTimeInput.value,
    callType: selectedCallType.value,
    onResult: (result) => {
      if (!result?.ok) {
        if (result?.reason === 'assignee_not_found') {
          showSnack('행의 담당자 정보와 일치하는 프로필이 없습니다')
          return
        }
        if (result?.reason === 'virtual_column_missing') {
          showSnack('DB에 가상도면배포 컬럼이 없습니다')
          return
        }
        showSnack('메뉴 저장 실패')
        return
      }
      const selectedText = selectedCallType.value ? ` (${selectedCallType.value})` : ''
      showSnack(`메뉴 저장 완료${selectedText}`)
      closeCallDialog()
    },
  })
}

const setVirtualDrawingDistribution = (enabled) => {
  const rowId = activeCallRow.value?.id
  if (!rowId) return

  emit('save-row-menu', {
    rowId,
    virtualDrawingDistributed: enabled,
    onResult: (result) => {
      if (!result?.ok) {
        if (result?.reason === 'virtual_column_missing') {
          showSnack('DB에 가상도면배포 컬럼이 없습니다')
          return
        }
        showSnack(enabled ? '가상도면 배포 실패' : '가상도면 배포 취소 실패')
        return
      }
      showSnack(enabled ? '가상도면 배포 적용' : '가상도면 배포 취소')
      closeCallDialog()
    },
  })
}

const submitRequestAlertReply = (alert) => {
  const message = String(requestReplyDrafts.value[alert.id] ?? '').trim()
  if (!message) {
    showSnack('답변 내용을 입력해주세요')
    return
  }

  emit('submit-request-alert-reply', {
    requestId: alert.request_id,
    message,
    onResult: (result) => {
      if (!result?.ok) {
        showSnack('답변 등록 실패')
        return
      }
      requestReplyDrafts.value[alert.id] = ''
      showSnack('답변 등록 완료')
    },
  })
}

const completeRequestAlert = (alert) => {
  const message = String(requestReplyDrafts.value[alert.id] ?? '').trim()
  emit('complete-request-alert', {
    requestId: alert.request_id,
    message,
    onResult: (result) => {
      if (!result?.ok) {
        showSnack('완료 처리 실패')
        return
      }
      requestReplyDrafts.value[alert.id] = ''
      showSnack('요청 완료 처리됨')
    },
  })
}

const parseAlertLines = (message) =>
  String(message ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

onBeforeUnmount(() => {
  for (const timer of longPressTimers.values()) {
    clearTimeout(timer)
  }
  longPressTimers.clear()
})
</script>

<template>
  <section class="min-h-screen w-full">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div class="flex flex-col gap-2 px-2 py-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:px-6 md:py-2.5">
        <div class="flex items-center justify-between gap-2">
          <h1 class="text-sm font-bold text-slate-900 md:text-lg">{{ pageTitle }}</h1>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            :class="realtimeConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
          >
            {{ realtimeConnected ? '실시간 연결됨' : '실시간 재연결 중' }}
          </span>
        </div>
        <div class="grid grid-cols-[1fr_1fr_1fr_auto_auto_auto] items-center gap-1 md:flex md:items-center md:gap-2">
          <Button class="h-8 px-2 text-[11px] md:h-9 md:px-3 md:text-xs" variant="outline" @click="emit('move-week', -1)">지난주</Button>
          <Button class="h-8 px-2 text-[11px] md:h-9 md:px-3 md:text-xs" variant="outline" :disabled="weekOffset === 0" @click="emit('reset-week')">
            이번주
          </Button>
          <Button class="h-8 px-2 text-[11px] md:h-9 md:px-3 md:text-xs" variant="outline" @click="emit('move-week', 1)">다음주</Button>
          <button
            type="button"
            class="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:h-9 md:w-9"
            @click="emit('go-notifications')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M9 17a3 3 0 0 0 6 0" />
            </svg>
            <span
              v-if="unreadNotificationCount > 0"
              class="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white"
            >
              {{ unreadNotificationCount > 99 ? '99+' : unreadNotificationCount }}
            </span>
          </button>
          <button
            v-if="canReorderRows"
            type="button"
            class="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:h-9 md:w-9"
            @click="emit('go-stats')"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19h16" />
              <path d="M7 15v-4" />
              <path d="M12 15V9" />
              <path d="M17 15V6" />
            </svg>
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-2 py-1 text-left hover:bg-slate-50 md:ml-2 md:px-3 md:py-1.5"
            @click="emit('go-my-page')"
          >
            <p class="text-[11px] font-bold text-slate-900 md:text-xs">{{ profile?.name || '사용자' }}</p>
            <p class="hidden text-[11px] text-slate-600 md:block">
              {{ [profile?.position, profile?.department].filter(Boolean).join(' · ') || '프로필' }}
            </p>
          </button>
        </div>
      </div>
    </header>

    <div class="px-1.5 py-2.5 md:px-6 md:py-4">
      <div v-if="planLoading" class="p-8 text-center text-sm text-slate-500">데이터 로딩 중...</div>
      <div v-else-if="planError" class="p-8 text-center text-sm text-red-600">{{ planError }}</div>
      <div v-else>
        <div class="mb-4 grid grid-cols-4 gap-1.5 md:hidden">
          <div class="rounded-lg border border-indigo-200 bg-white p-2 shadow-sm">
            <p class="text-[10px] font-bold text-indigo-700">일일목표</p>
            <p class="mt-1 text-sm font-extrabold text-slate-900">{{ scheduleSummary.dailyTargetHead }}</p>
          </div>
          <div class="rounded-lg border border-emerald-200 bg-white p-2 shadow-sm">
            <p class="text-[10px] font-bold text-emerald-700">완료</p>
            <p class="mt-1 text-sm font-extrabold text-slate-900">{{ scheduleSummary.completedHead }}</p>
          </div>
          <div class="rounded-lg border border-blue-200 bg-white p-2 shadow-sm">
            <p class="text-[10px] font-bold text-blue-700">총수량</p>
            <p class="mt-1 text-sm font-extrabold text-slate-900">{{ scheduleSummary.totalHead }}</p>
          </div>
          <div class="rounded-lg border border-amber-200 bg-white p-2 shadow-sm">
            <p class="text-[10px] font-bold text-amber-700">잔여</p>
            <p class="mt-1 text-sm font-extrabold text-slate-900">{{ scheduleSummary.remainingHead }}</p>
          </div>
          <div class="rounded-lg border border-fuchsia-200 bg-white p-2 shadow-sm">
            <p class="text-[10px] font-bold text-fuchsia-700">오늘야근</p>
            <p class="mt-1 text-[11px] font-extrabold text-slate-900">{{ scheduleSummary.todayOvertimeText }}</p>
          </div>
          <div class="rounded-lg border border-cyan-200 bg-white p-2 shadow-sm">
            <p class="text-[10px] font-bold text-cyan-700">주간야근</p>
            <p class="mt-1 text-[11px] font-extrabold text-slate-900">{{ scheduleSummary.weeklyOvertimeText }}</p>
          </div>
          <div class="rounded-lg border border-purple-200 bg-white p-2 shadow-sm">
            <p class="text-[10px] font-bold text-purple-700">토요일</p>
            <p class="mt-1 text-[11px] font-extrabold text-slate-900">{{ scheduleSummary.saturdayWork }}</p>
          </div>
          <div class="rounded-lg border border-rose-200 bg-white p-2 shadow-sm">
            <p class="text-[10px] font-bold text-rose-700">일요일</p>
            <p class="mt-1 text-[11px] font-extrabold text-slate-900">{{ scheduleSummary.sundayWork }}</p>
          </div>
        </div>

        <div class="mb-6 hidden overflow-auto rounded-xl border border-indigo-200 bg-white shadow-sm md:block">
          <table class="w-full border-collapse" style="table-layout: fixed; min-width: 980px">
            <thead class="bg-indigo-50">
              <tr>
                <th class="border border-indigo-200 px-2 py-2 text-center text-xs font-bold text-indigo-900">일일 생산 목표(헤드)</th>
                <th class="border border-indigo-200 px-2 py-2 text-center text-xs font-bold text-indigo-900">완료 헤드</th>
                <th class="border border-indigo-200 px-2 py-2 text-center text-xs font-bold text-indigo-900">총 헤드</th>
                <th class="border border-indigo-200 px-2 py-2 text-center text-xs font-bold text-indigo-900">잔여 헤드</th>
                <th class="border border-indigo-200 px-2 py-2 text-center text-xs font-bold text-indigo-900">오늘 야근</th>
                <th class="border border-indigo-200 px-2 py-2 text-center text-xs font-bold text-indigo-900">주간 야근</th>
                <th class="border border-indigo-200 px-2 py-2 text-center text-xs font-bold text-indigo-900">토요일</th>
                <th class="border border-indigo-200 px-2 py-2 text-center text-xs font-bold text-indigo-900">일요일</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-indigo-200 px-2 py-2 text-center text-sm font-semibold">
                  {{ scheduleSummary.dailyTargetHead }}
                </td>
                <td class="border border-indigo-200 px-2 py-2 text-center text-sm font-semibold">
                  {{ scheduleSummary.completedHead }}
                </td>
                <td class="border border-indigo-200 px-2 py-2 text-center text-sm font-semibold">
                  {{ scheduleSummary.totalHead }}
                </td>
                <td class="border border-indigo-200 px-2 py-2 text-center text-sm font-semibold">
                  {{ scheduleSummary.remainingHead }}
                </td>
                <td class="border border-indigo-200 px-2 py-2 text-center text-sm font-semibold">
                  {{ scheduleSummary.todayOvertimeText }}
                </td>
                <td class="border border-indigo-200 px-2 py-2 text-center text-sm font-semibold">
                  {{ scheduleSummary.weeklyOvertimeText }}
                </td>
                <td class="border border-indigo-200 px-2 py-2 text-center text-sm font-semibold">
                  {{ scheduleSummary.saturdayWork }}
                </td>
                <td class="border border-indigo-200 px-2 py-2 text-center text-sm font-semibold">
                  {{ scheduleSummary.sundayWork }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 md:text-sm">
              도면 배포 {{ scheduleSummary.totalHead }}헤드
            </span>
            <span class="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
              전체헤드수 {{ scheduleSummary.plannedTotalHead }}헤드
            </span>
            <span class="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-800">
              도면배포율 {{ getDrawingDistributionRate() }}% ({{ scheduleSummary.distributedDrawingCount ?? 0 }} / {{ scheduleSummary.totalDrawingCount ?? 0 }})
            </span>
          </div>
          <div class="ml-auto flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-3">
            <input
              v-model="localSearchText"
              type="text"
              class="h-9 w-full rounded-md border border-slate-300 px-3 text-sm md:w-64"
              placeholder="검색어 입력"
              @keydown.enter.prevent="emitSearchChange"
            />
            <label class="flex select-none items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                v-model="localSearchAllDates"
                type="checkbox"
                class="h-4 w-4"
                @change="emitSearchChange"
              />
              전체
            </label>
          </div>
          <div class="w-full">
            <div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-300"
                :style="{ width: `${getDrawingDistributionRate()}%` }"
              />
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div v-for="groupData in groupedRows" :key="groupData.group">
            <h2 class="mb-2 text-base font-bold text-slate-900">{{ groupData.group }}</h2>
            <div class="space-y-3 md:hidden">
              <div v-if="groupData.rows.length === 0" class="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500 shadow-sm">
                데이터 없음
              </div>
              <article
                v-for="row in groupData.rows"
                :key="`mobile-${groupData.group}-${row.id}`"
                class="rounded-xl border p-2 shadow-sm select-none"
                :draggable="canReorderRows"
                @dragstart="handleDragStart($event, row.id)"
                @dragover="handleDragOver"
                @drop.prevent="handleDrop(row.id)"
                :class="
                  isRowCompleted(row)
                    ? 'border-orange-200 bg-orange-50/60'
                    : isVirtualDistributedRow(row)
                      ? 'border-sky-200 bg-sky-50/70 text-slate-700'
                      : isRowDisabled(row)
                        ? 'border-slate-300 bg-slate-100 text-slate-700'
                      : 'border-slate-200 bg-white'
                "
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                        {{ row.work_type || '-' }}
                      </span>
                      <span>No. {{ row.no ?? '-' }}</span>
                      <span>{{ row.initial || '-' }}</span>
                    </div>
                    <p class="mt-1 text-sm font-bold text-slate-900">{{ row.company || '-' }}</p>
                    <p class="text-xs text-slate-600">{{ row.place || '-' }}</p>
                    <p class="text-xs text-slate-600">{{ row.area || '-' }}</p>
                  </div>
                  <div class="flex shrink-0 flex-col items-end gap-1">
                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-extrabold"
                        :class="
                          isRowDisabled(row)
                            ? 'border-slate-300 bg-slate-100 text-slate-600'
                            : 'border-slate-300 bg-white text-slate-700'
                        "
                        @click.stop="openCallDialog(row)"
                      >
                        ⋯
                      </button>
                      <button
                        v-if="canReorderRows"
                        type="button"
                        class="rounded-full px-2 py-1 text-[10px] font-bold"
                        :class="
                          isMobileRowEditing(row.id)
                            ? 'border border-emerald-600 bg-emerald-600 text-white'
                            : 'border border-slate-300 bg-white text-slate-700'
                        "
                        @click.stop="toggleMobileRowEdit(row.id)"
                      >
                        {{ isMobileRowEditing(row.id) ? '완료' : '수정' }}
                      </button>
                    </div>
                    <span
                      class="rounded-full px-2 py-1 text-[10px] font-extrabold"
                      :class="
                        isVirtualDistributedRow(row)
                          ? 'bg-sky-100 text-sky-700'
                          : isRowDisabled(row)
                          ? 'bg-slate-300 text-slate-700'
                            : 'bg-emerald-100 text-emerald-700'
                      "
                    >
                      {{ isVirtualDistributedRow(row) ? '가상배포' : isRowDisabled(row) ? '배포전' : '배포완료' }}
                    </span>
                    <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-700">
                      {{ getPlanUnitLabel(row) }} {{ getPlanQty(row) }}
                    </span>
                  </div>
                </div>

                <div class="mt-3 space-y-2">
                  <div
                    v-for="(stageRow, rowIdx) in mobileStageRows"
                    :key="`${row.id}-stage-row-${rowIdx}`"
                    class="grid gap-2"
                    :class="stageRow.length === 4 ? 'grid-cols-4' : 'grid-cols-3'"
                  >
                    <button
                      v-for="stageKey in stageRow"
                      :key="`${row.id}-${stageKey}`"
                      type="button"
                      class="inline-flex items-center justify-center rounded-lg border px-1.5 py-2 text-[11px] font-semibold"
                      :class="[
                        statusClass(getCellText(row, stageKey)),
                        getCellText(row, stageKey) === '없음' ? 'border-slate-200 bg-transparent' : '',
                        !isMobileRowEditing(row.id) ? 'cursor-not-allowed' : '',
                      ]"
                      @mousedown.stop="handleMobileStagePressStart(row, stageKey, props.currentWorkMan)"
                      @mouseup.stop="endLongPress(row.id, stageKey)"
                      @mouseleave.stop="endLongPress(row.id, stageKey)"
                      @touchstart.stop="handleMobileStagePressStart(row, stageKey, props.currentWorkMan)"
                      @touchend.stop="endLongPress(row.id, stageKey)"
                      @touchcancel.stop="endLongPress(row.id, stageKey)"
                      @click.stop="handleMobileStageClick(row, stageKey, props.currentWorkMan)"
                    >
                      <span>{{ stageMeta[stageKey].workMan }}</span>
                    </button>
                  </div>
                </div>

      
              </article>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                합계 - 홀 {{ groupData.totals.hole }} / 헤드 {{ groupData.totals.head }} / 그루브 {{ groupData.totals.groove }} / 중량 {{ groupData.totals.weight.toFixed(2) }}
              </div>
            </div>

            <div class="hidden overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
              <table class="w-full border-collapse" :style="{ minWidth: `${tableTotalWidth}px`, tableLayout: 'fixed' }">
                <thead class="bg-blue-50">
                  <tr>
                    <th
                      v-for="col in productTableColumns"
                      :key="`${groupData.group}-head-${col.key}`"
                      class="border border-blue-200 px-2 py-3 text-sm font-bold text-slate-800"
                      :class="col.align === 'center' ? 'text-center' : 'text-left'"
                      :style="{ width: `${col.width}px` }"
                    >
                      {{ col.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="groupData.rows.length === 0">
                    <td :colspan="productTableColumns.length" class="border border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
                      데이터 없음
                    </td>
                  </tr>
                  <tr
                    v-for="row in groupData.rows"
                    :key="`${groupData.group}-${row.id}`"
                    :class="
                      isRowCompleted(row)
                        ? 'bg-orange-50 text-slate-700 hover:bg-orange-50'
                        : isVirtualDistributedRow(row)
                          ? 'bg-sky-50 text-slate-700 hover:bg-sky-50'
                          : isRowDisabled(row)
                            ? 'bg-slate-50 text-slate-400'
                          : isDistributedRow(row)
                            ? 'font-semibold hover:bg-slate-50/70'
                            : 'hover:bg-slate-50/70'
                    "
                    role="button"
                    tabindex="0"
                    @mousedown="handleRowPressStart(row, props.currentWorkMan)"
                    @mouseup="endLongPress(row.id, 'row')"
                    @mouseleave="endLongPress(row.id, 'row')"
                    @touchstart="handleRowPressStart(row, props.currentWorkMan)"
                    @touchend="endLongPress(row.id, 'row')"
                    @touchcancel="endLongPress(row.id, 'row')"
                    @dragover="handleDragOver"
                    @drop.prevent="handleDrop(row.id)"
                    @click="handleRowClick(row, props.currentWorkMan)"
                    @keyup.enter="handleRowClick(row, props.currentWorkMan)"
                    class="select-none"
                  >
                    <td
                      v-for="col in productTableColumns"
                      :key="`${groupData.group}-${row.id}-${col.key}`"
                      class="border border-slate-200 px-2 py-3 text-sm"
                      :class="[
                        isRowDisabled(row) ? 'text-slate-400' : 'text-slate-700',
                        col.align === 'center' ? 'text-center' : 'text-left',
                      ]"
                      :style="{ width: `${col.width}px` }"
                    >
                      <span
                        v-if="col.key === 'no'"
                        class="inline-flex items-center justify-center gap-1"
                      >
                        <span
                          class="inline-flex cursor-grab items-center rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 active:cursor-grabbing"
                          :draggable="canReorderRows"
                          @mousedown.stop
                          @touchstart.stop
                          @dragstart.stop="handleDragStart($event, row.id)"
                        >
                          {{ getCellText(row, col.key) }}
                        </span>
                      </span>
                      <button
                        v-else-if="isCallColumn(col.key)"
                        type="button"
                        class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        @mousedown.stop
                        @touchstart.stop
                        @click.stop="openCallDialog(row)"
                      >
                        메뉴
                      </button>
                      <button
                        v-else-if="isStageColumn(col.key)"
                        type="button"
                        class="inline-flex min-w-[64px] items-center justify-center rounded-md px-2 py-1 text-xs font-semibold"
                        :class="[
                          statusClass(getCellText(row, col.key)),
                          getCellText(row, col.key) === '없음' ? 'border border-transparent shadow-none' : '',
                        ]"
                        @mousedown.stop="handleStagePressStart(row, col.key, props.currentWorkMan)"
                        @mouseup.stop="endLongPress(row.id, col.key)"
                        @mouseleave.stop="endLongPress(row.id, col.key)"
                        @touchstart.stop="handleStagePressStart(row, col.key, props.currentWorkMan)"
                        @touchend.stop="endLongPress(row.id, col.key)"
                        @touchcancel.stop="endLongPress(row.id, col.key)"
                        @click.stop="handleStageClick(row, col.key, props.currentWorkMan)"
                      >
                        {{ getCellText(row, col.key) }}
                      </button>
                      <span v-else>{{ getCellText(row, col.key) }}</span>
                    </td>
                  </tr>
                  <tr class="bg-slate-50">
                    <td :colspan="productTableColumns.length" class="border border-slate-200 px-2 py-2 text-right text-sm font-semibold text-slate-700">
                      합계 - 홀 {{ groupData.totals.hole }} / 헤드 {{ groupData.totals.head }} / 그루브
                      {{ groupData.totals.groove }} / 중량 {{ groupData.totals.weight.toFixed(2) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="snackMessage"
      class="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-slate-900/95 px-8 py-5 text-lg font-bold text-white shadow-2xl"
    >
      {{ snackMessage }}
    </div>

    <div
      v-if="requestAlerts.length > 0"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px] p-4"
    >
      <div class="w-full max-w-3xl max-h-[85vh] space-y-3 overflow-y-auto pr-1">
        <div
          v-for="alert in requestAlerts"
          :key="alert.id"
          class="rounded-2xl border border-blue-300 bg-white p-0 shadow-2xl overflow-hidden"
        >
          <div class="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-blue-100">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs">!</span>
              <p class="text-sm font-extrabold text-blue-900 tracking-tight">요청 알림</p>
            </div>
            <span class="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">실시간</span>
          </div>
          <div class="px-4 py-3.5">
            <p class="text-sm font-bold text-slate-900">{{ alert.title || '요청알림' }}</p>
            <div class="mt-2 space-y-1.5">
              <p
                v-for="(line, lineIdx) in parseAlertLines(alert.message)"
                :key="`${alert.id}-${lineIdx}`"
                class="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800"
              >
                {{ line }}
              </p>
            </div>
            <div v-if="canReplyRequestAlert(alert)" class="mt-3">
              <textarea
                v-model="requestReplyDrafts[alert.id]"
                class="min-h-[84px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="답변 입력"
              />
              <div class="mt-2 flex justify-end gap-2">
                <Button class="h-8 px-3 text-xs border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" variant="outline" @click="completeRequestAlert(alert)">답변완료</Button>
                <Button class="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700" @click="submitRequestAlertReply(alert)">답변 등록</Button>
              </div>
            </div>
          </div>
          <div class="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-2.5">
            <Button class="h-8 px-3 text-xs" variant="outline" @click="emit('dismiss-reply-alert', alert.id)">닫기</Button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="replyAlerts.length > 0"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
    >
      <div class="w-full max-w-3xl max-h-[85vh] space-y-3 overflow-y-auto pr-1">
        <div
          v-for="alert in replyAlerts"
          :key="alert.id"
          class="rounded-2xl border border-emerald-300 bg-white p-0 shadow-2xl overflow-hidden"
        >
          <div class="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2.5 border-b border-emerald-100">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">✓</span>
              <p class="text-sm font-extrabold text-emerald-900 tracking-tight">요청 처리 알림</p>
            </div>
            <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">실시간</span>
          </div>
          <div class="px-4 py-3.5">
            <p class="text-sm font-bold text-slate-900">{{ alert.title || '완료알림' }}</p>
            <div class="mt-2 space-y-1.5">
              <p
                v-for="(line, lineIdx) in parseAlertLines(alert.message)"
                :key="`${alert.id}-done-${lineIdx}`"
                class="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-sm text-slate-800"
              >
                {{ line }}
              </p>
            </div>
          </div>
          <div class="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-2.5">
            <Button class="h-8 px-3 text-xs" variant="outline" @click="emit('dismiss-reply-alert', alert.id)">닫기</Button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isCallDialogOpen"
      class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
      @click.self="closeCallDialog"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 class="mb-4 text-lg font-bold text-slate-900">메뉴</h3>
        <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p class="font-semibold text-slate-800">회사명: {{ activeCallRow?.company || '-' }}</p>
          <p class="mt-1 font-semibold text-slate-800">현장명: {{ activeCallRow?.place || '-' }}</p>
          <p class="mt-1 font-semibold text-slate-800">구역명: {{ activeCallRow?.area || '-' }}</p>
          <p class="mt-1 font-semibold text-slate-800">비고: {{ activeCallRow?.memo || '-' }}</p>
          <p class="mt-2 rounded-md bg-amber-100 px-2 py-1 text-sm font-extrabold text-amber-900">
            검수날짜: {{ formatKoreanDateText(activeCallRow?.test_date) }}
          </p>
        </div>
        <div class="space-y-2">
          <label
            v-for="option in callOptions"
            :key="option"
            class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
          >
            <input
              v-model="selectedCallType"
              class="h-4 w-4"
              type="radio"
              name="call-type"
              :value="option"
            />
            <span class="text-sm font-semibold text-slate-800">{{ option }}</span>
          </label>
        </div>
        <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p class="mb-2 text-sm font-bold text-slate-800">지연시간 입력</p>
          <div class="grid grid-cols-[1fr_120px] gap-2">
            <input
              v-model="delayTextInput"
              class="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              type="text"
              placeholder="지연 사유 입력"
            />
            <input
              v-model.number="delayTimeInput"
              class="w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-right"
              type="number"
              min="0"
              step="1"
              placeholder="분"
            />
          </div>
        </div>
        <button
          type="button"
          class="mt-4 w-full rounded-xl border border-blue-600 bg-blue-600 px-4 py-3 text-base font-extrabold text-white shadow-md transition hover:bg-blue-700"
          @click="openDrawingFromMenu"
        >
          🖼️ 도면보기
        </button>
        <button
          v-if="activeCallRow && !isActualDistributedRow(activeCallRow)"
          type="button"
          class="mt-2 w-full rounded-xl border px-4 py-2.5 text-sm font-extrabold transition"
          :class="
            activeCallRow?.virtual_drawing_distributed
              ? 'border-slate-400 bg-slate-50 text-slate-700 hover:bg-slate-100'
              : 'border-sky-500 bg-sky-50 text-sky-700 hover:bg-sky-100'
          "
          @click="setVirtualDrawingDistribution(!activeCallRow?.virtual_drawing_distributed)"
        >
          {{ activeCallRow?.virtual_drawing_distributed ? '가상도면 배포 취소' : '가상도면 배포' }}
        </button>
        <p v-if="activeCallRow?.virtual_drawing_distributed" class="mt-1 text-center text-[11px] font-semibold text-sky-700">
          현재 가상도면 배포 적용됨
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <Button class="h-9 px-3 text-xs" variant="outline" @click="closeCallDialog">닫기</Button>
          <Button class="h-9 px-3 text-xs" @click="confirmCallDialog">확인</Button>
        </div>
      </div>
    </div>

    <div
      v-if="isDrawingDialogOpen"
      class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-0"
      @click.self="closeDrawingDialog"
    >
      <div class="h-full w-full rounded-none bg-white p-0">
        <div class="flex items-center justify-between border-b border-slate-200 px-2 py-2">
          <h3 class="text-lg font-bold text-slate-900">도면 보기</h3>
          <div class="flex items-center gap-2">
            <Button
              class="h-8 border-violet-300 bg-violet-50 px-2 text-xs font-semibold text-violet-800 hover:bg-violet-100"
              variant="outline"
              @click="drawingListCollapsed = !drawingListCollapsed"
            >
              {{ drawingListCollapsed ? '목록 펼치기' : '목록 접기' }}
            </Button>
            <Button class="h-8 px-2 text-xs" variant="outline" @click="closeDrawingDialog">닫기</Button>
          </div>
        </div>
        <div
          class="grid h-[calc(100vh-49px)] gap-0"
          :class="drawingListCollapsed ? 'grid-cols-[1fr]' : 'grid-cols-[260px_1fr]'"
        >
          <div
            v-if="!drawingListCollapsed"
            class="overflow-auto border-r border-slate-200 p-1"
          >
            <div v-if="drawingLoading" class="p-3 text-sm text-slate-500">도면 조회 중...</div>
            <div v-else-if="drawingError" class="p-3 text-sm text-red-600">{{ drawingError }}</div>
            <div v-else-if="drawingFiles.length === 0" class="p-3 text-sm text-slate-500">등록된 도면이 없습니다</div>
            <template v-else>
              <button
                v-for="file in drawingFiles"
                :key="file.id"
                type="button"
                class="mb-1 w-full rounded-sm border px-2 py-1.5 text-left text-xs"
                :class="selectedDrawingUrl === file.viewUrl ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'"
                @click="selectedDrawingUrl = file.viewUrl"
              >
                <p class="truncate font-semibold">{{ file.name }}</p>
                <p class="mt-1 truncate text-[11px] text-slate-500">{{ file.rawPath || file.viewUrl || '경로 없음' }}</p>
              </button>
            </template>
          </div>
          <div class="h-full bg-slate-50">
            <div v-if="selectedDrawingUrl" class="h-full w-full">
              <iframe :src="selectedDrawingUrl" class="h-full w-full" title="drawing-viewer" />
            </div>
            <div v-else class="flex h-full items-center justify-center text-sm text-slate-500">
              미리볼 도면을 선택해주세요
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
