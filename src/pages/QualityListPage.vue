<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/features/quality-list/quality.css'
import QualityFilters from '@/features/quality-list/components/QualityFilters.vue'
import QualityTable from '@/features/quality-list/components/QualityTable.vue'
import { useDialog } from '@/composables/useDialog'

const { confirm, alert } = useDialog()
import {
  copyQualityItem,
  deleteQualityItem,
  fetchQualityList,
  moveQualityItemDate,
  removeSubscription,
  reorderQualityItems,
  subscribeQualityList,
  updateCancelCount,
  updateLotRange,
  updateReturnFlag,
} from '@/features/quality-list/services/quality.service'
import { formatIsoDate, formatQualityDate, getNextTuesday, moveByWeeks, parseQualityDate } from '@/features/quality-list/utils/date'
import { exportQualityListToExcel, exportQualityStampToExcel, printQualityList } from '@/features/quality-list/utils/print'
import type { QualityCountField } from '@/features/quality-list/services/quality.service'
import type { QualityListRow } from '@/features/quality-list/types/quality'
import { mapQualityListRow } from '@/features/quality-list/types/quality'

const router = useRouter()
const route = useRoute()

const initialQueryDate = typeof route.query.testDate === 'string' ? route.query.testDate : ''
const currentTuesday = ref(initialQueryDate ? getNextTuesday(parseQualityDate(initialQueryDate)) : getNextTuesday(new Date()))
const searchQuery = ref('')
const showAllRecords = ref(false)
const loading = ref(false)
const items = ref<QualityListRow[]>([])

const currentDateLabel = computed(() =>
  showAllRecords.value ? '검수리스트 전체 검색결과' : formatQualityDate(currentTuesday.value),
)
const calendarValue = computed(() => formatIsoDate(currentTuesday.value))

function testDate() {
  return formatQualityDate(currentTuesday.value)
}

async function load() {
  loading.value = true
  try {
    items.value = await fetchQualityList({
      testDate: testDate(),
      searchQuery: searchQuery.value,
      showAllRecords: showAllRecords.value,
    })
  } catch (error) {
    await alert(error instanceof Error ? error.message : '검수리스트를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

function sortItems(list: QualityListRow[]): QualityListRow[] {
  const next = [...list]
  next.sort((a, b) => {
    const sortDiff = (a.sort ?? 0) - (b.sort ?? 0)
    if (sortDiff !== 0) return sortDiff
    if (showAllRecords.value) {
      return String(b.testDate ?? '').localeCompare(String(a.testDate ?? ''))
    }
    return a.id - b.id
  })
  return next
}

function matchesFilters(row: QualityListRow): boolean {
  if (!showAllRecords.value && row.testDate !== testDate()) return false
  const raw = String(searchQuery.value ?? '').trim().toLowerCase()
  if (!raw) return true
  const tokens = raw.split(/\s+/).filter(Boolean)
  const haystack = `${row.company} ${row.place} ${row.area} ${row.initial} ${row.lotNameH} ${row.lotNumH ?? ''}`
    .toLowerCase()
  return tokens.every((token) => haystack.includes(token))
}

const channel = subscribeQualityList((payload) => {
  if (payload.eventType === 'DELETE') {
    const id = Number((payload.old as { id?: unknown } | null)?.id ?? 0)
    if (!id) return
    items.value = items.value.filter((item) => item.id !== id)
    return
  }

  if (!payload.new) return
  const mapped = mapQualityListRow(payload.new)
  const index = items.value.findIndex((item) => item.id === mapped.id)
  const keep = matchesFilters(mapped)

  if (payload.eventType === 'INSERT') {
    if (!keep) return
    items.value = sortItems(index === -1 ? [...items.value, mapped] : items.value)
    return
  }

  if (payload.eventType === 'UPDATE') {
    if (index === -1) {
      if (keep) items.value = sortItems([...items.value, mapped])
      return
    }
    if (!keep) {
      items.value = items.value.filter((_, i) => i !== index)
      return
    }
    const next = [...items.value]
    next[index] = mapped
    items.value = sortItems(next)
  }
})

watch(showAllRecords, (val) => {
  if (!val) {
    currentTuesday.value = getNextTuesday(new Date())
  }
  void load()
})

function previousWeek() {
  currentTuesday.value = moveByWeeks(currentTuesday.value, -1)
  void load()
}

function nextWeek() {
  currentTuesday.value = moveByWeeks(currentTuesday.value, 1)
  void load()
}

function thisWeek() {
  currentTuesday.value = getNextTuesday(new Date())
  void load()
}

function clearSearch() {
  searchQuery.value = ''
  void load()
}

function handleCalendarChange(value: string) {
  const parsed = parseQualityDate(value)
  currentTuesday.value = getNextTuesday(parsed)
  void load()
}

function goCreate() {
  void router.push({
    name: 'quality-create',
    query: { testDate: testDate() },
  })
}

function goCalculation() {
  void router.push({ name: 'quality-calculation' })
}

function goEdit(item: QualityListRow) {
  void router.push({ name: 'quality-update', params: { id: item.id }, query: { testDate: testDate() } })
}

function goCountCheck(item: QualityListRow) {
  void router.push({ name: 'quality-count-check', params: { id: item.id }, query: { testDate: testDate() } })
}

async function onDelete(item: QualityListRow) {
  if (!await confirm(`${item.company} ${item.place} 항목을 삭제할까요?`)) return
  await deleteQualityItem(item.id)
}

async function onMoveDate(item: QualityListRow) {
  const newTestDate = window.prompt('이동할 검사일을 입력하세요. 예: 2026년 04월 14일', item.testDate)
  if (!newTestDate || newTestDate === item.testDate) return
  await moveQualityItemDate(item.id, newTestDate)
}

async function onCopyDate(item: QualityListRow) {
  const newTestDate = window.prompt('복사할 검사일을 입력하세요. 예: 2026년 04월 14일', item.testDate)
  if (!newTestDate) return
  await copyQualityItem(item, newTestDate)
}

async function onUpdateRange(item: QualityListRow, lotStart: number) {
  await updateLotRange(item, lotStart)
}

async function onUpdateCancel(item: QualityListRow, field: QualityCountField, value: number) {
  await updateCancelCount(item.id, field, value)
}

async function onToggleReturn(item: QualityListRow, field: QualityCountField, value: boolean) {
  await updateReturnFlag(item.id, field, value)
}

async function onMoveUp(index: number) {
  if (index <= 0) return
  const next = [...items.value]
  ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
  await reorderQualityItems(next)
  items.value = next
}

async function onMoveDown(index: number) {
  if (index >= items.value.length - 1) return
  const next = [...items.value]
  ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
  await reorderQualityItems(next)
  items.value = next
}

function onExport() {
  exportQualityListToExcel(items.value, `quality-list-${Date.now()}.xlsx`)
}

function onStamp(item: QualityListRow) {
  exportQualityStampToExcel(item)
}

function onPrint() {
  printQualityList(items.value, `${currentDateLabel.value} 검수리스트`)
}

onMounted(() => {
  void load()
})

onBeforeUnmount(() => {
  void removeSubscription(channel)
})
</script>

<template>
  <div class="page-shell">
    <QualityFilters
      v-model:search-query="searchQuery"
      v-model:show-all-records="showAllRecords"
      :current-date-label="currentDateLabel"
      :calendar-value="calendarValue"
      :loading="loading"
      @calendar-change="handleCalendarChange"
      @search="load"
      @clear="clearSearch"
      @previous-week="previousWeek"
      @next-week="nextWeek"
      @this-week="thisWeek"
      @refresh="load"
      @create="goCreate"
      @export="onExport"
      @print="onPrint"
      @calculation="goCalculation"
    />

    <QualityTable
      :items="items"
      :loading="loading"
      :show-all-records="showAllRecords"
      @edit="goEdit"
      @delete="onDelete"
      @stamp="onStamp"
      @update-range="onUpdateRange"
      @update-cancel="onUpdateCancel"
    />
  </div>
</template>
