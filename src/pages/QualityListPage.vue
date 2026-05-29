<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/features/quality-list/quality.css'
import QualityFilters from '@/features/quality-list/components/QualityFilters.vue'
import QualityTable from '@/features/quality-list/components/QualityTable.vue'
import PrintSettingsDialog from '@/features/printing/PrintSettingsDialog.vue'
import { printCurrentPage } from '@/features/printing/pagePrint'
import { useDialog } from '@/composables/useDialog'

const { confirm, alert } = useDialog()
import {
  copyQualityItem,
  deleteQualityItem,
  downloadNoticePdf,
  fetchQualityList,
  moveQualityItemDate,
  removeSubscription,
  reorderQualityItems,
  subscribeQualityList,
  updateCancelCount,
  updateLotRange,
  updateReturnFlag,
  uploadNoticePdf,
} from '@/features/quality-list/services/quality.service'
import { formatIsoDate, formatQualityDate, getNextTuesday, moveByWeeks, parseQualityDate } from '@/features/quality-list/utils/date'
import { exportQualityListToExcel, exportQualityStampToExcel } from '@/features/quality-list/utils/print'
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
const isPrinting = ref(false)
const isPrintSettingsOpen = ref(false)
const noticeFileInput = ref<HTMLInputElement | null>(null)

const currentDateLabel = computed(() =>
  showAllRecords.value ? '검수리스트 전체 검색결과' : formatQualityDate(currentTuesday.value),
)
const calendarValue = computed(() => formatIsoDate(currentTuesday.value))
const printTotal = computed(() =>
  items.value.reduce(
    (sum, item) => sum + item.a32 + item.a40 + item.a50 + item.a65 + item.m65 + item.m80 + item.m100 + item.m125 + item.m150 + item.m200,
    0,
  ),
)

const printCountColumns = [
  { label: '32A', key: 'a32', className: 'quality-print-inch' },
  { label: '40A', key: 'a40', className: 'quality-print-inch' },
  { label: '50A', key: 'a50', className: 'quality-print-inch' },
  { label: '65A', key: 'a65', className: 'quality-print-inch' },
  { label: '65A', key: 'm65', className: 'quality-print-metric' },
  { label: '80A', key: 'm80', className: 'quality-print-metric' },
  { label: '100A', key: 'm100', className: 'quality-print-metric' },
  { label: '125A', key: 'm125', className: 'quality-print-metric' },
  { label: '150A', key: 'm150', className: 'quality-print-metric' },
  { label: '200A', key: 'm200', className: 'quality-print-metric' },
] as const

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

function openNoticeUpload() {
  noticeFileInput.value?.click()
}

async function handleNoticeUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length === 0) return

  const pdfFiles = files.filter((file) => file.name.toLowerCase().endsWith('.pdf'))
  if (pdfFiles.length !== files.length) {
    await alert('PDF 파일만 업로드할 수 있습니다.')
    return
  }

  try {
    const uploaded = []
    for (const file of pdfFiles) {
      uploaded.push(await uploadNoticePdf(file))
    }
    await alert(`${uploaded.length}개 통보서를 업로드했습니다.`)
  } catch (error) {
    await alert(error instanceof Error ? error.message : '통보서 업로드에 실패했습니다.')
  }
}

function noticeFileNameOf(item: QualityListRow) {
  const certification = String(item.lotCertification ?? '').replace(/^분기\s*/, '').trim()
  const number = String(item.lotKsdNum ?? '').trim()
  if (!certification || !number) return ''
  return `${certification} ${number}.pdf`
}

async function onNoticeDownload(item: QualityListRow) {
  const fileName = noticeFileNameOf(item)
  if (!fileName) {
    await alert('통보서 파일명을 만들 수 없습니다.')
    return
  }

  try {
    await downloadNoticePdf(fileName)
  } catch {
    await alert(`${fileName} 통보서를 찾지 못했습니다.`)
  }
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

function getLotRoundStyle(round: string) {
  if (round === '2차') return { color: '#ea580c' }
  if (round === '3차') return { color: '#16a34a' }
  if (round === '4차') return { color: '#7c3aed' }
  return { color: '#111827' }
}

function onPrint() {
  isPrintSettingsOpen.value = true
}

async function printQualityListPage(options = {}) {
  isPrintSettingsOpen.value = false
  await printCurrentPage(isPrinting, options, { margin: '8mm' })
}

onMounted(() => {
  void load()
})

onBeforeUnmount(() => {
  void removeSubscription(channel)
})
</script>

<template>
  <div class="page-shell quality-page-shell">
    <div class="quality-screen">
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
        @notice-upload="openNoticeUpload"
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
        @notification="onNoticeDownload"
        @stamp="onStamp"
        @update-range="onUpdateRange"
        @update-cancel="onUpdateCancel"
      />

      <input
        ref="noticeFileInput"
        type="file"
        class="hidden"
        accept="application/pdf,.pdf"
        multiple
        @change="handleNoticeUpload"
      />
    </div>

    <section class="quality-print-page">
      <h1>{{ currentDateLabel }} 검수리스트</h1>
      <div class="quality-print-summary">총합 : {{ printTotal }}개</div>
      <table class="quality-print-table">
        <colgroup>
          <col style="width: 32px" />
          <col style="width: 52px" />
          <col style="width: 26%" />
          <col style="width: 22%" />
          <col v-for="column in printCountColumns" :key="column.key" style="width: 46px" />
          <col style="width: 54px" />
        </colgroup>
        <thead>
          <tr>
            <th class="quality-print-base">N</th>
            <th class="quality-print-base">도번</th>
            <th class="quality-print-base">현장명</th>
            <th class="quality-print-base">확관</th>
            <th
              v-for="column in printCountColumns"
              :key="column.key"
              :class="column.className"
            >
              {{ column.label }}
            </th>
            <th class="quality-print-base">합계</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="items.length === 0">
            <td colspan="15">검수리스트가 없습니다.</td>
          </tr>
          <tr v-for="(item, index) in items" :key="item.id">
            <td>{{ index + 1 }}</td>
            <td class="quality-print-initial">{{ item.initial }}</td>
            <td class="quality-print-place">
              {{ item.company }} {{ item.place }}{{ item.area ? ' ' + item.area : '' }}
              <span v-if="showAllRecords && item.testDate" class="quality-print-date">({{ item.testDate.replace(/\s/g, '').slice(2) }})</span>
            </td>
            <td class="quality-print-lot">
              <div class="quality-print-lot-inner" :style="getLotRoundStyle(item.lotRound)">
                <span>({{ item.lotNumH ? String(item.lotNumH).slice(-3) : '---' }})</span>
                <strong>{{ item.lotNameH || '-' }}</strong>
                <span>{{ item.lotNumStartH || '' }} ~ {{ item.lotNumEndH || '' }}</span>
              </div>
            </td>
            <td
              v-for="column in printCountColumns"
              :key="column.key"
              :class="column.className"
            >
              {{ item[column.key] || '' }}
            </td>
            <td class="quality-print-total">{{ item.totalH || '' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <PrintSettingsDialog
      :open="isPrintSettingsOpen"
      @close="isPrintSettingsOpen = false"
      @print="printQualityListPage"
    />
  </div>
</template>

<style scoped>
.quality-print-page {
  display: none;
}

@media (min-width: 768px) {
  .quality-page-shell {
    height: calc(100vh - 82px);
    overflow: hidden;
    padding: 10px 20px 10px;
  }

  .quality-screen {
    display: flex;
    min-height: 0;
    height: 100%;
    flex-direction: column;
  }
}

@media print {
  .page-shell {
    max-width: none !important;
    padding: 0 !important;
  }

  .quality-screen {
    display: none !important;
  }

  .quality-print-page {
    display: block !important;
    color: #111827;
    font-family: "Malgun Gothic", Arial, sans-serif;
  }

  .quality-print-page h1 {
    margin: 0 0 10px;
    color: #1e3a8a;
    font-size: 20px;
    font-weight: 800;
    text-align: center;
  }

  .quality-print-summary {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
    color: #1e293b;
    font-size: 18px;
    font-weight: 800;
  }

  .quality-print-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 14px;
  }

  .quality-print-table th,
  .quality-print-table td {
    border-right: 1px solid #94a3b8;
    border-bottom: 1px solid #94a3b8;
    padding: 0;
    text-align: center;
    vertical-align: middle;
  }

  .quality-print-table th:first-child,
  .quality-print-table td:first-child {
    border-left: 1px solid #94a3b8;
  }

  .quality-print-table thead th {
    height: 40px;
    border-top: 1px solid #94a3b8;
    border-right: 1px solid #64748b;
    border-bottom: 2px solid #475569;
    color: #1e3a8a;
    font-size: 14px;
    font-weight: 800;
    white-space: nowrap;
  }

  .quality-print-base {
    background: #eff6ff;
  }

  .quality-print-inch {
    background: #dbeafe;
  }

  .quality-print-metric {
    background: #ffedd5;
    color: #7c2d12;
  }

  .quality-print-table tbody tr {
    height: 58px;
    page-break-inside: avoid;
  }

  .quality-print-initial {
    color: #334155;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.4;
    word-break: break-all;
  }

  .quality-print-place {
    padding: 6px 8px !important;
    color: #0f172a;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.5;
    text-align: left !important;
    word-break: keep-all;
  }

  .quality-print-date {
    color: #ea580c;
    white-space: nowrap;
  }

  .quality-print-lot {
    padding: 0 4px !important;
  }

  .quality-print-lot-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    white-space: nowrap;
  }

  .quality-print-lot-inner strong {
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    font-weight: 800;
    text-overflow: ellipsis;
  }

  .quality-print-lot-inner span {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
  }

  .quality-print-table tbody .quality-print-inch {
    background: #fff;
    color: #111827;
    font-weight: 800;
  }

  .quality-print-table tbody .quality-print-metric {
    background: #fff7ed;
    color: #111827;
    font-weight: 800;
  }

  .quality-print-total {
    font-weight: 800;
  }
}
</style>
