<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import { useAuth } from '@/composables/useAuth'
import { useDragAutoScroll } from '@/features/welding-schedule/composables/useDragAutoScroll'
import { useWeldingSchedulePermission } from '@/features/welding-schedule/composables/useWeldingSchedulePermission'
import WeldingScheduleDayQtyBadges from '@/features/welding-schedule/components/WeldingScheduleDayQtyBadges.vue'
import WeldingScheduleSearchInput from '@/features/welding-schedule/components/WeldingScheduleSearchInput.vue'
import WeldingScheduleStatusLegend from '@/features/welding-schedule/components/WeldingScheduleStatusLegend.vue'
import {
  getWeldingAreaClass,
  getWeldingAreaLabel,
} from '@/features/welding-schedule/utils/weldingScheduleAreaDisplay'
import { matchesWeldingScheduleSearch } from '@/features/welding-schedule/utils/weldingScheduleSearch'
import {
  addDays,
  clearWeldingScheduleRow,
  fetchWeldingScheduleRows,
  formatIsoDate,
  formatKoreanDate,
  formatShortDate,
  getWeekStartMonday,
  updateWeldingScheduleRow,
} from '@/features/welding-schedule/services/weldingSchedule.service'
import { WELDING_SCHEDULE_PERMISSION_ERROR } from '@/features/welding-schedule/utils/weldingSchedulePermission'

const { session } = useAuth()
const { canManageWeldingSchedule } = useWeldingSchedulePermission(session)
const weekStartIso = ref(formatIsoDate(getWeekStartMonday()))
const rows = ref([])
const loading = ref(false)
const errorMessage = ref('')
const savingMessage = ref('')
const draggingRowId = ref(null)
const dragOverKey = ref('')
const activeRow = ref(null)
const isRowDialogOpen = ref(false)
const searchText = ref('')
const weldingInspectors = ['민뚜라', '진민택']
const { start: startDragAutoScroll, stop: stopDragAutoScroll } = useDragAutoScroll()

const weekStartDate = computed(() => getWeekStartMonday(new Date(`${weekStartIso.value}T00:00:00`)))
const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStartDate.value, index)
    return {
      key: formatIsoDate(date),
      label: ['월', '화', '수', '목', '금', '토', '일'][index],
      dateLabel: formatShortDate(date),
      displayLabel: `${date.getMonth() + 1}월${date.getDate()}일`,
      fullLabel: formatKoreanDate(date),
    }
  }),
)
const weekRangeLabel = computed(() => {
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  return `${start?.fullLabel ?? ''} ~ ${end?.fullLabel ?? ''}`
})
const hasActiveSearch = computed(() => String(searchText.value ?? '').trim().length > 0)
const filteredRows = computed(() => {
  if (!hasActiveSearch.value) return rows.value
  return rows.value.filter((row) => matchesWeldingScheduleSearch(row, searchText.value))
})
const rowsByDate = computed(() => {
  const grouped = new Map(weekDays.value.map((day) => [day.key, []]))
  for (const row of filteredRows.value) {
    const key = String(row?.welding_schedule_date ?? '')
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(row)
  }
  return grouped
})
const visibleWeekDays = computed(() => {
  if (!hasActiveSearch.value) return weekDays.value
  return weekDays.value.filter((day) => (rowsByDate.value.get(day.key) ?? []).length > 0)
})
const getInspectorRows = (dateKey, inspector) =>
  (rowsByDate.value.get(dateKey) ?? []).filter((row) => String(row?.welding_schedule_inspector || row?.welding_inspector || '').trim() === inspector)
const getUnassignedRows = (dateKey) =>
  (rowsByDate.value.get(dateKey) ?? []).filter((row) => !weldingInspectors.includes(String(row?.welding_schedule_inspector || row?.welding_inspector || '').trim()))
const getRowsTotals = (targetRows) =>
  targetRows.reduce(
    (acc, row) => {
      acc.head += Number(row?.head || 0)
      acc.hole += Number(row?.hole || 0)
      acc.inch += Number(row?.inch || 0)
      return acc
    },
    { head: 0, hole: 0, inch: 0 },
  )
const getDayTotals = (dateKey) => getRowsTotals(rowsByDate.value.get(dateKey) ?? [])
const displayCount = computed(() => filteredRows.value.length)

const loadRows = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    rows.value = await fetchWeldingScheduleRows(weekStartIso.value)
  } catch (error) {
    errorMessage.value = error?.message ?? '용접일정을 불러오지 못했습니다.'
    rows.value = []
  } finally {
    loading.value = false
  }
}

const moveWeek = (delta) => {
  weekStartIso.value = formatIsoDate(addDays(weekStartDate.value, delta * 7))
}

const resetWeek = () => {
  weekStartIso.value = formatIsoDate(getWeekStartMonday())
}

const printPage = () => {
  window.print()
}

const formatQty = (value) => {
  const num = Number(value || 0)
  return num === 0 ? '' : num.toLocaleString('ko-KR')
}
const openRowDialog = (row) => {
  activeRow.value = row
  isRowDialogOpen.value = true
}
const closeRowDialog = () => {
  isRowDialogOpen.value = false
  activeRow.value = null
}
const cancelWeldingSchedule = async () => {
  if (!canManageWeldingSchedule.value) {
    savingMessage.value = WELDING_SCHEDULE_PERMISSION_ERROR
    window.setTimeout(() => {
      savingMessage.value = ''
    }, 2500)
    return
  }
  if (!activeRow.value?.id) return

  savingMessage.value = '용접일정 취소 중...'
  try {
    await clearWeldingScheduleRow(activeRow.value.id)
    const canceledId = activeRow.value.id
    rows.value = rows.value.filter((row) => row.id !== canceledId)
    closeRowDialog()
    savingMessage.value = ''
  } catch (error) {
    savingMessage.value = error?.message ?? '용접일정을 취소하지 못했습니다.'
    window.setTimeout(() => {
      savingMessage.value = ''
    }, 2500)
  }
}
const getDropKey = (dateKey, inspector) => `${dateKey}-${inspector}`
const isDropActive = (dateKey, inspector) => dragOverKey.value === getDropKey(dateKey, inspector)
const handleDragStart = (event, row) => {
  if (!canManageWeldingSchedule.value) {
    event.preventDefault()
    savingMessage.value = WELDING_SCHEDULE_PERMISSION_ERROR
    window.setTimeout(() => {
      savingMessage.value = ''
    }, 2500)
    return
  }
  draggingRowId.value = row?.id ?? null
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(row?.id ?? ''))
  startDragAutoScroll()
}
const handleDragEnd = () => {
  draggingRowId.value = null
  dragOverKey.value = ''
  stopDragAutoScroll()
}
const handleDragOver = (event, dateKey, inspector) => {
  if (!canManageWeldingSchedule.value) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverKey.value = getDropKey(dateKey, inspector)
}
const handleDrop = async (event, dateKey, inspector) => {
  event.preventDefault()
  if (!canManageWeldingSchedule.value) {
    savingMessage.value = WELDING_SCHEDULE_PERMISSION_ERROR
    window.setTimeout(() => {
      savingMessage.value = ''
    }, 2500)
    handleDragEnd()
    return
  }
  const rowId = Number(event.dataTransfer.getData('text/plain') || draggingRowId.value)
  const target = rows.value.find((row) => row.id === rowId)
  handleDragEnd()
  if (!target) return
  if (target.welding_schedule_date === dateKey && target.welding_schedule_inspector === inspector) return

  savingMessage.value = '용접일정 변경 중...'
  try {
    await updateWeldingScheduleRow(rowId, dateKey, inspector)
    rows.value = rows.value.map((row) =>
      row.id === rowId
        ? {
            ...row,
            welding_schedule_date: dateKey,
            welding_schedule_inspector: inspector,
          }
        : row,
    )
    savingMessage.value = ''
  } catch (error) {
    savingMessage.value = error?.message ?? '용접일정을 변경하지 못했습니다.'
    window.setTimeout(() => {
      savingMessage.value = ''
    }, 2500)
  }
}

onMounted(loadRows)
watch(weekStartIso, loadRows)
</script>

<template>
  <main class="min-h-screen bg-slate-50 px-4 py-6 pt-[76px] md:px-6 md:pt-[96px]">
    <section class="mx-auto max-w-[1600px]">
      <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div class="print-hide border-b border-slate-200 px-5 py-5">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div class="min-w-0">
              <h1 class="text-2xl font-extrabold text-slate-900">용접일정</h1>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <p class="text-sm font-semibold text-slate-600">{{ weekRangeLabel }}</p>
                <WeldingScheduleStatusLegend />
                <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  총 {{ displayCount }}건
                </span>
                <span v-if="savingMessage" class="text-xs font-bold text-slate-500">{{ savingMessage }}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <Button class="h-9 px-3 text-sm" variant="outline" @click="moveWeek(-1)">지난주</Button>
              <Button class="h-9 px-3 text-sm" variant="outline" @click="resetWeek">이번주</Button>
              <Button class="h-9 px-3 text-sm" variant="outline" @click="moveWeek(1)">다음주</Button>
              <WeldingScheduleSearchInput v-model="searchText" />
              <Button class="h-9 bg-slate-900 px-3 text-sm text-white hover:bg-slate-800" @click="printPage">출력</Button>
            </div>
          </div>
        </div>

        <div class="hidden border-b border-slate-200 px-5 py-4 print:block">
          <h1 class="text-xl font-extrabold text-slate-900">용접일정</h1>
          <p class="mt-1 text-sm font-semibold text-slate-700">{{ weekRangeLabel }}</p>
        </div>

        <div class="p-3 md:p-4">
        <div v-if="loading" class="py-10 text-center text-sm font-semibold text-slate-500">용접일정을 불러오는 중입니다.</div>
        <div v-else-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm font-semibold text-rose-700">
          {{ errorMessage }}
        </div>
        <div v-else-if="hasActiveSearch && filteredRows.length === 0" class="py-10 text-center text-sm font-semibold text-slate-500">
          검색 결과가 없습니다.
        </div>
        <div v-else class="space-y-3">
          <section
            v-for="day in visibleWeekDays"
            :key="day.key"
            class="border border-slate-400 bg-white"
          >
            <div class="flex flex-wrap items-center gap-2 border-b border-slate-400 bg-slate-100 px-3 py-1.5">
              <h3 class="text-sm font-extrabold text-slate-900">{{ day.label }}요일({{ day.displayLabel }})</h3>
              <WeldingScheduleDayQtyBadges :totals="getDayTotals(day.key)" />
            </div>

            <div class="grid gap-[10px] xl:grid-cols-2">
              <div
                v-for="inspector in weldingInspectors"
                :key="`${day.key}-${inspector}`"
                class="min-h-[34px] overflow-x-auto border border-slate-300 bg-white"
                :class="isDropActive(day.key, inspector) ? 'bg-blue-50 ring-2 ring-blue-300' : ''"
                @dragenter.prevent="dragOverKey = getDropKey(day.key, inspector)"
                @dragover="handleDragOver($event, day.key, inspector)"
                @dragleave="dragOverKey = ''"
                @drop="handleDrop($event, day.key, inspector)"
              >
                  <table v-if="getInspectorRows(day.key, inspector).length > 0" class="min-w-[620px] w-full border-collapse text-[12px]">
                    <thead>
                      <tr class="bg-slate-800 text-white">
                        <th class="border border-slate-500 px-2 py-1.5 text-center">도번</th>
                        <th class="border border-slate-500 px-2 py-1.5 text-center">회사명</th>
                        <th class="border border-slate-500 px-2 py-1.5 text-center">현장명</th>
                        <th class="border border-slate-500 px-2 py-1.5 text-center">구역명</th>
                        <th class="border border-slate-500 px-2 py-1.5 text-center">헤드</th>
                        <th class="border border-slate-500 px-2 py-1.5 text-center">홀</th>
                        <th class="border border-slate-500 px-2 py-1.5 text-center">인치</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in getInspectorRows(day.key, inspector)"
                        :key="row.id"
                        :draggable="canManageWeldingSchedule"
                        class="odd:bg-white even:bg-slate-50 hover:bg-blue-50"
                        :class="[
                          canManageWeldingSchedule ? 'cursor-move' : '',
                          draggingRowId === row.id ? 'opacity-50' : '',
                        ]"
                        @dragstart="handleDragStart($event, row)"
                        @dragend="handleDragEnd"
                      >
                        <td class="border border-slate-300 px-2 py-1.5 text-center font-extrabold text-slate-950">{{ row.initial || '-' }}</td>
                        <td class="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-900">{{ row.company || '-' }}</td>
                        <td class="border border-slate-300 px-2 py-1.5 text-center text-slate-800">{{ row.place || '-' }}</td>
                        <td
                          class="border border-slate-300 px-2 py-1.5 text-center cursor-pointer"
                          :class="getWeldingAreaClass(row)"
                          @click.stop="openRowDialog(row)"
                        >
                          {{ getWeldingAreaLabel(row) }}
                        </td>
                        <td class="border border-slate-300 px-2 py-1.5 text-center font-extrabold text-emerald-700">{{ formatQty(row.head) }}</td>
                        <td class="border border-slate-300 px-2 py-1.5 text-center font-extrabold text-sky-700">{{ formatQty(row.hole) }}</td>
                        <td class="border border-slate-300 px-2 py-1.5 text-center font-extrabold text-amber-700">{{ formatQty(row.inch) }}</td>
                      </tr>
                      <tr v-if="getInspectorRows(day.key, inspector).length > 0" class="bg-slate-100 font-extrabold text-slate-900">
                        <td colspan="4" class="border border-slate-300 px-2 py-1.5 text-center">합계</td>
                        <td class="border border-slate-300 px-2 py-1.5 text-center text-emerald-700">{{ formatQty(getRowsTotals(getInspectorRows(day.key, inspector)).head) }}</td>
                        <td class="border border-slate-300 px-2 py-1.5 text-center text-sky-700">{{ formatQty(getRowsTotals(getInspectorRows(day.key, inspector)).hole) }}</td>
                        <td class="border border-slate-300 px-2 py-1.5 text-center text-amber-700">{{ formatQty(getRowsTotals(getInspectorRows(day.key, inspector)).inch) }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="h-9 border border-dashed border-slate-300 bg-slate-50"></div>
              </div>
            </div>

            <div v-if="getUnassignedRows(day.key).length > 0" class="border-t border-slate-400 bg-white">
              <div class="border-b border-slate-300 bg-slate-100 px-2 py-1 text-xs font-extrabold text-slate-900">미지정</div>
              <div class="overflow-x-auto">
                <table class="min-w-[620px] w-full border-collapse text-[11px]">
                  <thead>
                    <tr class="bg-white text-slate-600">
                      <th class="border border-slate-300 px-1.5 py-1 text-center">도번</th>
                      <th class="border border-slate-300 px-1.5 py-1 text-center">회사명</th>
                      <th class="border border-slate-300 px-1.5 py-1 text-center">현장명</th>
                      <th class="border border-slate-300 px-1.5 py-1 text-center">구역명</th>
                      <th class="border border-slate-300 px-1.5 py-1 text-center">헤드</th>
                      <th class="border border-slate-300 px-1.5 py-1 text-center">홀</th>
                      <th class="border border-slate-300 px-1.5 py-1 text-center">인치</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in getUnassignedRows(day.key)" :key="`unassigned-${row.id}`">
                      <td class="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-900">{{ row.initial || '-' }}</td>
                      <td class="border border-slate-300 px-1.5 py-1 text-center">{{ row.company || '-' }}</td>
                      <td class="border border-slate-300 px-1.5 py-1 text-center">{{ row.place || '-' }}</td>
                      <td
                        class="border border-slate-300 px-1.5 py-1 text-center cursor-pointer"
                        :class="getWeldingAreaClass(row)"
                        @click.stop="openRowDialog(row)"
                      >
                        {{ getWeldingAreaLabel(row) }}
                      </td>
                      <td class="border border-slate-300 px-1.5 py-1 text-center font-bold">{{ formatQty(row.head) }}</td>
                      <td class="border border-slate-300 px-1.5 py-1 text-center font-bold">{{ formatQty(row.hole) }}</td>
                      <td class="border border-slate-300 px-1.5 py-1 text-center font-bold">{{ formatQty(row.inch) }}</td>
                    </tr>
                    <tr class="bg-slate-100 font-extrabold text-slate-900">
                      <td colspan="4" class="border border-slate-300 px-1.5 py-1 text-center">합계</td>
                      <td class="border border-slate-300 px-1.5 py-1 text-center">{{ formatQty(getRowsTotals(getUnassignedRows(day.key)).head) }}</td>
                      <td class="border border-slate-300 px-1.5 py-1 text-center">{{ formatQty(getRowsTotals(getUnassignedRows(day.key)).hole) }}</td>
                      <td class="border border-slate-300 px-1.5 py-1 text-center">{{ formatQty(getRowsTotals(getUnassignedRows(day.key)).inch) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
        </div>
      </div>
    </section>

    <div
      v-if="isRowDialogOpen && activeRow"
      class="print-hide fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <p class="text-[15px] font-extrabold text-slate-900">{{ activeRow.company || '-' }}</p>
        <p class="mt-1 text-sm font-semibold text-slate-700">{{ activeRow.place || '-' }}</p>
        <p class="text-sm text-slate-600">{{ getWeldingAreaLabel(activeRow) }}</p>
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <button
            v-if="canManageWeldingSchedule"
            type="button"
            class="rounded-md bg-rose-100 px-5 py-2 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-200"
            @click="cancelWeldingSchedule"
          >
            용접일정취소
          </button>
          <button
            type="button"
            class="rounded-md bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-200"
            @click="closeRowDialog"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
@media print {
  main {
    background: white !important;
    padding: 0 !important;
  }

  .print-hide {
    display: none !important;
  }

  section {
    max-width: none !important;
    gap: 0 !important;
  }

  table {
    min-width: 0 !important;
    font-size: 9px;
  }

  th,
  td {
    padding: 2px 3px !important;
  }
}
</style>
