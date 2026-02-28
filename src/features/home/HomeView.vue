<script setup>
import { ref, watch } from 'vue'
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
  beveling: { field: 'beveling_status', workMan: '생산' },
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
  티면치: 'beveling',
  생산: 'beveling',
  티뽑기: 'beveling',
  티뽑기및면치: 'beveling',
  면치: 'beveling',
  메인: 'main_work',
  관리자: 'all',
  전체: 'all',
}
const snackMessage = ref('')
let snackTimer = null
const pressStartedAt = ref({})
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
  const distributed = Number(props.scheduleSummary?.totalHead ?? 0)
  const planned = Number(props.scheduleSummary?.plannedTotalHead ?? 0)
  if (!Number.isFinite(distributed) || !Number.isFinite(planned) || planned <= 0) return 0
  const ratio = (distributed / planned) * 100
  return Math.min(100, Math.max(0, Math.round(ratio)))
}

const getCellText = (row, key) => {
  const stage = stageMeta[key]
  if (stage) {
    const raw = String(row?.[stage.field] ?? '').trim()
    if (raw === '작업중' || raw === '작업완료') return raw
    return '작업전'
  }
  if ((key === 'head' || key === 'hole') && Number(row?.[key] ?? 0) === 0) {
    return ''
  }
  return row?.[key] ?? ''
}

const normalizeWorkMan = (value) => String(value ?? '').replaceAll(' ', '').trim()
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

const isRowDisabled = (row) => {
  const drawingDate = String(row?.drawing_date ?? '').trim()
  return drawingDate.length === 0
}

const isRowCompleted = (row) =>
  Object.values(stageMeta).every((meta) => String(row?.[meta.field] ?? '').trim() === '작업완료')

const isDistributedRow = (row) => !isRowDisabled(row)

const isStageColumn = (key) => Object.hasOwn(stageMeta, key)
const isCallColumn = (key) => key === 'call_action'

const statusClass = (status) => {
  if (status === '작업중') return 'bg-green-100 text-green-800'
  if (status === '작업완료') return 'bg-red-100 text-red-800'
  return 'bg-white text-slate-700'
}

const handlePressStart = (rowId) => {
  pressStartedAt.value[rowId] = Date.now()
}

const resolvePressMs = (rowId) => {
  const started = pressStartedAt.value[rowId]
  if (!started) return 0
  return Date.now() - started
}

const handleRowClick = (row, currentWorkMan) => {
  if (isRowDisabled(row)) {
    showSnack('도면 배포전 입니다')
    return
  }

  const stageKey = resolveStageKeyFromWorkMan(currentWorkMan)
  if (!stageKey) {
    showSnack('권한이 없습니다.')
    return
  }
  if (stageKey === 'all') {
    showSnack('관리자는 변경할 공정 칸을 눌러주세요')
    return
  }

  const pressMs = resolvePressMs(row.id)
  emit('toggle-work-status', {
    rowId: row.id,
    stageKey,
    longPressMs: pressMs,
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

const handleStageClick = (row, stageKey, currentWorkMan) => {
  if (isRowDisabled(row)) {
    showSnack('도면 배포전 입니다')
    return
  }

  if (!canControlStageByWorkMan(currentWorkMan, stageKey)) {
    showSnack('권한이 없습니다.')
    return
  }

  const pressMs = resolvePressMs(row.id)
  emit('toggle-work-status', {
    rowId: row.id,
    stageKey,
    longPressMs: pressMs,
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

const handleDragStart = (rowId) => {
  draggedRowId.value = rowId
}

const handleDrop = (targetRowId) => {
  if (!draggedRowId.value || draggedRowId.value === targetRowId) return
  emit('reorder-rows', {
    sourceRowId: draggedRowId.value,
    targetRowId: targetRowId,
    onResult: (result) => {
      if (!result?.ok && result?.reason === 'cross_group_not_allowed') {
        showSnack('같은 작업유형 내에서만 순서를 변경할 수 있습니다')
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
        showSnack('메뉴 저장 실패')
        return
      }
      const selectedText = selectedCallType.value ? ` (${selectedCallType.value})` : ''
      showSnack(`메뉴 저장 완료${selectedText}`)
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
</script>

<template>
  <section class="min-h-screen w-full">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5">
        <div class="flex items-center gap-3">
          <h1 class="text-lg font-bold text-slate-900">{{ pageTitle }}</h1>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            :class="realtimeConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
          >
            {{ realtimeConnected ? '실시간 연결됨' : '실시간 재연결 중' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Button class="h-9 px-3 text-xs" variant="outline" @click="emit('move-week', -1)">지난주</Button>
          <Button class="h-9 px-3 text-xs" variant="outline" :disabled="weekOffset === 0" @click="emit('reset-week')">
            이번주
          </Button>
          <Button class="h-9 px-3 text-xs" variant="outline" @click="emit('move-week', 1)">다음주</Button>
          <button
            type="button"
            class="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
            type="button"
            class="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left hover:bg-slate-50"
            @click="emit('go-my-page')"
          >
            <p class="text-xs font-bold text-slate-900">{{ profile?.name || '사용자' }}</p>
            <p class="text-[11px] text-slate-600">
              {{ [profile?.position, profile?.department].filter(Boolean).join(' · ') || '프로필' }}
            </p>
          </button>
        </div>
      </div>
    </header>

    <div class="px-6 py-4">
      <div v-if="planLoading" class="p-8 text-center text-sm text-slate-500">데이터 로딩 중...</div>
      <div v-else-if="planError" class="p-8 text-center text-sm text-red-600">{{ planError }}</div>
      <div v-else>
        <div class="mb-6 overflow-auto rounded-xl border border-indigo-200 bg-white shadow-sm">
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
            <span class="rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-800">
              일정/야근 계산 기준
            </span>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
              도면 배포 {{ scheduleSummary.totalHead }}헤드
            </span>
            <span class="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
              전체헤드수 {{ scheduleSummary.plannedTotalHead }}헤드
            </span>
            <span class="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-800">
              도면배포율 {{ getDrawingDistributionRate() }}%
            </span>
          </div>
          <div class="ml-auto flex items-center gap-3">
            <input
              v-model="localSearchText"
              type="text"
              class="h-9 w-64 rounded-md border border-slate-300 px-3 text-sm"
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
            <div class="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
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
                        : isRowDisabled(row)
                          ? 'bg-slate-50 text-slate-400'
                          : isDistributedRow(row)
                            ? 'font-semibold hover:bg-slate-50/70'
                            : 'hover:bg-slate-50/70'
                    "
                    role="button"
                    tabindex="0"
                    draggable="true"
                    @mousedown="handlePressStart(row.id)"
                    @touchstart="handlePressStart(row.id)"
                    @dragstart="handleDragStart(row.id)"
                    @dragover.prevent
                    @drop.prevent="handleDrop(row.id)"
                    @click="handleRowClick(row, props.currentWorkMan)"
                    @keyup.enter="handleRowClick(row, props.currentWorkMan)"
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
                      <button
                        v-if="isCallColumn(col.key)"
                        type="button"
                        class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                          isRowDisabled(row) ? 'opacity-40' : '',
                        ]"
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
