<script setup>
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import MainProductionPlanGroupTable from '@/features/main/MainProductionPlanGroupTable.vue'

const props = defineProps({
  pageTitle: { type: String, required: true },
  weekOffset: { type: Number, default: 0 },
  selectedTuesdayIso: { type: String, default: '' },
  searchText: { type: String, default: '' },
  planLoading: { type: Boolean, default: false },
  planError: { type: String, default: '' },
  groupedRows: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'move-week',
  'reset-week',
  'go-register',
  'search-change',
  'select-tuesday',
  'edit-row',
  'toggle-row-inspection',
  'toggle-row-hold',
  'delete-row',
  'cell-action',
  'move-test-date',
  'load-drawing-files',
])

const overallTotals = computed(() =>
  props.groupedRows.reduce(
    (acc, group) => {
      acc.head += Number(group?.totals?.head ?? 0)
      acc.hole += Number(group?.totals?.hole ?? 0)
      acc.groove += Number(group?.totals?.groove ?? 0)
      acc.weight += Number(group?.totals?.weight ?? 0)
      return acc
    },
    { head: 0, hole: 0, groove: 0, weight: 0 },
  ),
)

const isCalendarDialogOpen = ref(false)
const localCalendarValue = ref('')
const localSearchText = ref('')
const localCalendarMonth = ref(new Date())
const calendarWeekLabels = ['일', '월', '화', '수', '목', '금', '토']
const isRowDialogOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const selectedRowId = ref(null)
const isTestDateDialogOpen = ref(false)
const pendingTestDateIso = ref('')
const activeTestDateRow = ref(null)
const isDrawingDialogOpen = ref(false)
const drawingFiles = ref([])
const drawingLoading = ref(false)
const drawingError = ref('')
const selectedDrawingUrl = ref('')

const formatKoreanDateLabel = (value) => {
  const parsed = parseIsoDate(value)
  if (!parsed) return '-'
  return `${parsed.getFullYear()}년 ${String(parsed.getMonth() + 1).padStart(2, '0')}월 ${String(parsed.getDate()).padStart(2, '0')}일`
}

watch(
  () => props.searchText,
  (value) => {
    localSearchText.value = String(value ?? '')
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

const openCalendarDialog = () => {
  localCalendarValue.value = String(props.selectedTuesdayIso ?? '')
  syncCalendarMonth(localCalendarValue.value)
  isCalendarDialogOpen.value = true
}

const closeCalendarDialog = () => {
  isCalendarDialogOpen.value = false
}

const handleSearchInput = (value) => {
  localSearchText.value = value
}

const submitSearch = () => {
  emit('search-change', localSearchText.value)
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

const handleCellClick = ({ row, columnKey }) => {
  if (!row?.id || !columnKey) return
  if (columnKey === 'memo') {
    openRowMenu(row)
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
    drawingLoading.value = true
    drawingError.value = ''
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
  emit('cell-action', { row, columnKey })
}

const closeTestDateDialog = () => {
  isTestDateDialogOpen.value = false
  activeTestDateRow.value = null
  pendingTestDateIso.value = ''
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
  isDrawingDialogOpen.value = false
  drawingLoading.value = false
  drawingError.value = ''
  drawingFiles.value = []
  selectedDrawingUrl.value = ''
}

</script>

<template>
  <section class="min-h-screen bg-white">
    <main class="w-full px-4 pb-5 md:px-6 md:pb-8">
      <div class="print-title-bar sticky top-[72px] z-20 -mx-4 border-b border-slate-200 bg-white px-4 py-2 md:-mx-6 md:px-6">
        <div class="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div>
          
            <h1 class="text-lg font-extrabold text-slate-900 md:text-xl">{{ pageTitle }}</h1>
          </div>
          <div class="print-hide flex flex-col gap-2 xl:items-end">
            <div class="flex flex-wrap items-center gap-2">
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" @click="emit('move-week', -1)">지난주</Button>
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" :disabled="weekOffset === 0" @click="emit('reset-week')">
                이번주
              </Button>
              <Button class="h-8 px-3 text-xs md:text-sm" variant="outline" @click="emit('move-week', 1)">다음주</Button>
              <Button class="h-8 bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800 md:text-sm" @click="emit('go-register')">
                등록
              </Button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                @click="openCalendarDialog"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M3 10h18" />
                </svg>
              </button>
              <div class="relative min-w-[220px] flex-1 xl:w-[320px] xl:flex-none">
                <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400" stroke-width="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <Input
                  class="h-8 border-slate-200 pl-9 pr-3 text-xs md:text-sm"
                  :model-value="localSearchText"
                  placeholder="검색어를 입력해주세요"
                  @update:model-value="handleSearchInput"
                  @keydown.enter="submitSearch"
                />
              </div>
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

      <div v-if="planLoading" class="py-16 text-center text-sm text-slate-500">데이터 로딩 중...</div>
      <div v-else-if="planError" class="py-16 text-center text-sm text-red-600">{{ planError }}</div>
      <div v-else-if="hasActiveSearch && visibleGroups.length === 0" class="py-16 text-center text-sm text-slate-500">검색 결과가 없습니다.</div>
      <div v-else class="mt-6 space-y-6">
        <MainProductionPlanGroupTable
          v-for="(groupData, groupIndex) in visibleGroups"
          :key="groupData.group"
          :group-data="groupData"
          :group-index="groupIndex"
          :overall-totals="overallTotals"
          @cell-click="handleCellClick"
          @open-row-menu="openRowMenu"
        />
      </div>
    </main>

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
        <div class="mt-6 flex items-center gap-3">
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
        </div>
      </div>
    </div>

    <div
      v-if="isDrawingDialogOpen"
      class="print-hide fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4 py-4"
      @click.self="closeDrawingDialog"
    >
      <div class="grid h-[85vh] w-full max-w-6xl gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-[280px_1fr]">
        <div class="border-b border-slate-200 bg-white p-4 md:border-b-0 md:border-r">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h3 class="text-base font-bold text-slate-900">도면 목록</h3>
            <button type="button" class="text-sm text-slate-500 hover:text-slate-700" @click="closeDrawingDialog">닫기</button>
          </div>
          <div class="max-h-[calc(85vh-88px)] space-y-2 overflow-y-auto">
            <div v-if="drawingLoading" class="rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">도면 조회 중...</div>
            <div v-else-if="drawingError" class="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-600">{{ drawingError }}</div>
            <div v-else-if="drawingFiles.length === 0" class="rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">등록된 도면이 없습니다.</div>
            <button
              v-for="file in drawingFiles"
              :key="file.id"
              type="button"
              class="w-full rounded-xl border px-3 py-2 text-left text-sm"
              :class="selectedDrawingUrl === file.viewUrl ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
              @click="selectedDrawingUrl = file.viewUrl"
            >
              <p class="truncate font-semibold">{{ file.name }}</p>
              <p class="mt-1 truncate text-xs text-slate-500">{{ file.rawPath || file.viewUrl || '' }}</p>
            </button>
          </div>
        </div>
        <div class="h-full bg-slate-50">
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
            <p class="mt-1 font-semibold text-slate-900">{{ activeDialogRow.drawing_date || '-' }}</p>
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
</style>
