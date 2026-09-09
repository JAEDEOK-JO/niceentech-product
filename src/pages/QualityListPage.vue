<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/features/quality-list/quality.css'
import QualityFilters from '@/features/quality-list/components/QualityFilters.vue'
import QualityTable from '@/features/quality-list/components/QualityTable.vue'
import QualityDateTransferDialog from '@/features/quality-list/components/QualityDateTransferDialog.vue'
import PrintSettingsDialog from '@/features/printing/PrintSettingsDialog.vue'
import MainPipeGroupingDialog from '@/features/quality-list/components/print/MainPipeGroupingDialog.vue'
import MainPipePrintTemplate from '@/features/quality-list/components/print/MainPipePrintTemplate.vue'
import BranchPipePrintTemplate from '@/features/quality-list/components/print/BranchPipePrintTemplate.vue'
import { printCurrentPage } from '@/features/printing/pagePrint'
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
  uploadNoticePdf,
} from '@/features/quality-list/services/quality.service'
import {
  downloadJoinCertificatePdf,
  fetchReceiptInfo,
  formatNoticeError,
  markNoticeDownloaded,
  saveNoticeBundleToFolder,
} from '@/features/quality-list/services/notice.service'
import { formatIsoDate, formatQualityDate, getNextTuesday, moveByWeeks, parseQualityDate } from '@/features/quality-list/utils/date'
import { exportQualityStampToExcel } from '@/features/quality-list/utils/print'
import {
  applyMainPipeGrouping,
  buildMainPipeGroups,
  chunkMainPipePages,
  toMainPipeCards,
} from '@/features/quality-list/utils/print/main-pipe'
import {
  buildBranchPipeItems,
  chunkBranchPipePages,
} from '@/features/quality-list/utils/print/branch-pipe'
import {
  buildNoticeCertificateModel,
  toCertificateListFileName,
  toJoinCertificateFileName,
} from '@/features/quality-list/utils/print/notice-certificate'
import { buildNoticeCertificateHtml } from '@/features/quality-list/utils/print/notice-certificate-html'
import type { QualityCountField } from '@/features/quality-list/services/quality.service'
import type { QualityListRow } from '@/features/quality-list/types/quality'
import type {
  BranchPipeItem,
  MainPipeGroupableGroup,
  MainPipeGroupItem,
  PrintEntryWithType,
} from '@/features/quality-list/types/print'
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
const printMode = ref<'list' | 'main' | 'branch'>('list')
const isGroupingDialogOpen = ref(false)
const groupingGroups = ref<MainPipeGroupableGroup[]>([])
const pendingMainPipeItems = ref<MainPipeGroupItem[]>([])
const mainPipeCards = ref<PrintEntryWithType[]>([])
const branchPipeItems = ref<BranchPipeItem[]>([])
const noticeFileInput = ref<HTMLInputElement | null>(null)
const transferItem = ref<QualityListRow | null>(null)
const transferBusy = ref(false)

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

const mainPipePages = computed(() => chunkMainPipePages(mainPipeCards.value))
const branchPipePages = computed(() => chunkBranchPipePages(branchPipeItems.value))
const printDefaultLandscape = computed(() => printMode.value !== 'main')
const printMargin = computed(() => {
  if (printMode.value === 'main') return '16mm'
  return '6mm'
})

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
    const sortChanged = items.value[index].sort !== mapped.sort
    next[index] = mapped
    items.value = sortChanged ? sortItems(next) : next
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

async function onNoticeDownload(item: QualityListRow) {
  try {
    const receipt = await fetchReceiptInfo({
      testDate: item.testDate,
      lotNum: item.lotNumH,
      lotType: item.lotType,
    })
    if (!receipt) {
      await alert('접수번호 없음')
      return
    }

    let joinFile
    try {
      joinFile = await downloadJoinCertificatePdf({
        lotCertification: item.lotCertification,
        lotNumH: item.lotNumH,
      })
    } catch (error) {
      console.error('[notice] storage download failed', error)
      await alert(`통보서 파일 확인 중 오류가 발생했습니다\n${formatNoticeError(error)}`)
      return
    }

    if (!joinFile) {
      const fileName = toJoinCertificateFileName(item.lotCertification, item.lotNumH)
      await alert(`통보서 파일(${fileName})을 찾을 수 없습니다`)
      return
    }

    const model = buildNoticeCertificateModel(item, receipt.receiptNum, receipt.lotType)
    const html = await buildNoticeCertificateHtml(model)
    const saved = await saveNoticeBundleToFolder({
      company: item.company,
      place: item.place,
      testDate: item.testDate,
      joinFileName: joinFile.fileName,
      joinBytes: joinFile.bytes,
      listFileName: toCertificateListFileName(item.place, item.area),
      html,
    })

    if (!saved.success) {
      console.error('[notice] save failed', saved)
      await alert(`통보서 생성 중 오류가 발생했습니다\n${formatNoticeError(saved.error)}`)
      return
    }

    await markNoticeDownloaded(item.id)
    items.value = items.value.map((row) => (
      row.id === item.id ? { ...row, noticeDownloaded: true } : row
    ))
  } catch (error) {
    console.error('[notice] generate failed', error)
    await alert(`통보서 생성 중 오류가 발생했습니다\n${formatNoticeError(error)}`)
  }
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

async function onMoveDate(item: QualityListRow, newTestDate: string) {
  transferBusy.value = true
  try {
    await moveQualityItemDate(item, newTestDate)
    transferItem.value = null
  } catch (error) {
    await alert(error instanceof Error ? error.message : '이동하지 못했습니다.')
  } finally {
    transferBusy.value = false
  }
}

function closeTransfer() {
  if (transferBusy.value) return
  transferItem.value = null
}

async function onCopyDate(item: QualityListRow, newTestDate: string) {
  transferBusy.value = true
  try {
    await copyQualityItem(item, newTestDate)
    transferItem.value = null
  } catch (error) {
    await alert(error instanceof Error ? error.message : '복사하지 못했습니다.')
  } finally {
    transferBusy.value = false
  }
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

const canReorder = computed(() => !showAllRecords.value && !searchQuery.value.trim())

async function onReorder(next: QualityListRow[]) {
  const previous = items.value
  const ordered = next.map((item, index) => ({ ...item, sort: index }))
  items.value = ordered
  try {
    await reorderQualityItems(ordered)
  } catch (error) {
    items.value = previous
    await alert(error instanceof Error ? error.message : '순서를 저장하지 못했습니다.')
  }
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
  printMode.value = 'list'
  isPrintSettingsOpen.value = true
}

function openPrintSettings() {
  isPrintSettingsOpen.value = true
}

function startMainPipePrint(allItems: MainPipeGroupItem[], groupedIndices: Record<string, number[]>) {
  mainPipeCards.value = toMainPipeCards(applyMainPipeGrouping(allItems, groupedIndices))
  if (mainPipeCards.value.length === 0) {
    void alert('출력할 메인관 데이터가 없습니다.')
    return
  }
  printMode.value = 'main'
  openPrintSettings()
}

async function handleMainPipePrint() {
  const { allItems, groupable } = buildMainPipeGroups(items.value)
  if (allItems.length === 0) {
    await alert('출력할 메인관 데이터가 없습니다.')
    return
  }
  if (groupable.length === 0) {
    startMainPipePrint(allItems, {})
    return
  }
  pendingMainPipeItems.value = allItems
  groupingGroups.value = groupable
  isGroupingDialogOpen.value = true
}

function onGroupingPrint(groupedIndices: Record<string, number[]>) {
  isGroupingDialogOpen.value = false
  startMainPipePrint(pendingMainPipeItems.value, groupedIndices)
}

async function handleBranchPipePrint() {
  const list = buildBranchPipeItems(items.value)
  if (list.length === 0) {
    await alert('출력할 가지관 데이터가 없습니다.')
    return
  }
  branchPipeItems.value = list
  printMode.value = 'branch'
  openPrintSettings()
}

async function printQualityListPage(options = {}) {
  isPrintSettingsOpen.value = false
  await printCurrentPage(isPrinting, options, { margin: printMargin.value })
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
        :total="printTotal"
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
        @print="onPrint"
        @main-pipe-print="handleMainPipePrint"
        @branch-pipe-print="handleBranchPipePrint"
      />

      <QualityTable
        :items="items"
        :loading="loading"
        :show-all-records="showAllRecords"
        :can-reorder="canReorder"
        @edit="goEdit"
        @delete="onDelete"
        @notification="onNoticeDownload"
        @stamp="onStamp"
        @update-range="onUpdateRange"
        @update-cancel="onUpdateCancel"
        @reorder="onReorder"
        @transfer="transferItem = $event"
      />

      <QualityDateTransferDialog
        :item="transferItem"
        :busy="transferBusy"
        @close="closeTransfer"
        @move="onMoveDate"
        @copy="onCopyDate"
      />

      <MainPipeGroupingDialog
        :open="isGroupingDialogOpen"
        :groups="groupingGroups"
        @close="isGroupingDialogOpen = false"
        @print="onGroupingPrint"
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

    <section class="quality-print-page" :class="{ 'is-print-active': printMode === 'list' }">
      <div class="quality-print-sheet">
        <table class="quality-print-table">
          <colgroup>
            <col class="quality-print-col-n" />
            <col class="quality-print-col-initial" />
            <col class="quality-print-col-place" />
            <col class="quality-print-col-lot" />
            <col v-for="column in printCountColumns" :key="column.key" class="quality-print-col-count" />
            <col class="quality-print-col-total" />
          </colgroup>
          <thead>
            <tr class="quality-print-title-row">
              <th colspan="15">
                <span class="quality-print-title-label">{{ currentDateLabel }} 검수리스트</span>
                <span class="quality-print-title-total">총합 : {{ printTotal }}개</span>
              </th>
            </tr>
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
              <td class="quality-print-n">{{ index + 1 }}</td>
              <td class="quality-print-initial">
                <span class="quality-print-initial-text">{{ item.initial }}</span>
              </td>
              <td class="quality-print-place">
                <div class="quality-print-place-wrap">
                  <span class="quality-print-place-text">
                    {{ item.company }} {{ item.place }}{{ item.area ? ' ' + item.area : '' }}
                    <span v-if="showAllRecords && item.testDate" class="quality-print-date">({{ item.testDate.replace(/\s/g, '').slice(2) }})</span>
                  </span>
                </div>
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
      </div>
    </section>

    <MainPipePrintTemplate :pages="mainPipePages" :active="printMode === 'main'" />
    <BranchPipePrintTemplate :pages="branchPipePages" :active="printMode === 'branch'" />

    <PrintSettingsDialog
      :open="isPrintSettingsOpen"
      :default-landscape="printDefaultLandscape"
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

  .quality-page-shell {
    height: auto !important;
    overflow: visible !important;
    padding: 0 !important;
  }

  .quality-screen {
    display: none !important;
  }

  .quality-print-page.is-print-active {
    display: block !important;
    color: #111827;
    font-family: TheJamsil, sans-serif !important;
  }

  .quality-print-page.is-print-active,
  .quality-print-page.is-print-active * {
    font-family: TheJamsil, sans-serif !important;
  }

  .quality-print-sheet {
    break-after: auto;
    page-break-after: auto;
  }

  .quality-print-table thead {
    display: table-header-group;
  }

  .quality-print-table tbody {
    display: table-row-group;
  }

  .quality-print-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
  }

  .quality-print-col-n {
    width: 32px;
  }

  .quality-print-col-initial {
    width: 72px;
  }

  .quality-print-col-place {
    width: auto;
  }

  .quality-print-col-lot {
    width: 160px;
  }

  .quality-print-col-count {
    width: 50px;
  }

  .quality-print-col-total {
    width: 48px;
  }

  .quality-print-table th,
  .quality-print-table td {
    border-right: 1px solid #94a3b8;
    border-bottom: 1px solid #94a3b8;
    padding: 0 2px;
    text-align: center;
    vertical-align: middle;
  }

  .quality-print-table th:first-child,
  .quality-print-table td:first-child {
    border-left: 1px solid #94a3b8;
  }

  .quality-print-table thead th {
    height: 32px;
    border-top: 1px solid #94a3b8;
    border-right: 1px solid #64748b;
    border-bottom: 2px solid #475569;
    color: #1e3a8a;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .quality-print-table thead .quality-print-title-row th,
  .quality-print-table thead .quality-print-title-row th:first-child {
    height: auto;
    padding: 0 0 6px;
    border: 0;
    background: transparent;
    color: #000;
    font-size: 18px;
    font-weight: 800;
    line-height: 1.2;
    text-align: left;
    white-space: nowrap;
  }

  .quality-print-title-label {
    color: #000;
  }

  .quality-print-title-total {
    margin-left: 0.4em;
    color: #ea580c;
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
    height: 50px;
    page-break-inside: auto;
    break-inside: auto;
  }

  .quality-print-table tbody td {
    height: 50px;
    max-height: 50px;
    overflow: hidden;
  }

  .quality-print-table tbody td.quality-print-lot {
    overflow: visible;
  }

  .quality-print-n,
  .quality-print-total {
    padding: 0 4px !important;
    font-weight: 800;
  }

  .quality-print-initial {
    padding: 2px !important;
    color: #334155;
    font-size: 12px;
    font-weight: 700;
    vertical-align: middle;
  }

  .quality-print-initial-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    word-break: break-all;
    line-height: 1.3;
    max-height: calc(1.3em * 2);
  }

  .quality-print-place {
    padding: 0 4px !important;
    color: #0f172a;
    font-size: 12px;
    font-weight: 700;
    text-align: left !important;
    vertical-align: middle;
  }

  .quality-print-place-wrap {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 100%;
  }

  .quality-print-place-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    word-break: keep-all;
    line-height: 1.3;
    max-height: calc(1.3em * 2);
    text-align: left;
    width: 100%;
  }

  .quality-print-date {
    color: #ea580c;
    white-space: nowrap;
  }

  .quality-print-lot {
    padding: 0 10px !important;
    white-space: nowrap;
    overflow: visible;
  }

  .quality-print-lot-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    white-space: nowrap;
  }

  .quality-print-lot-inner strong {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 800;
  }

  .quality-print-lot-inner span {
    flex-shrink: 0;
    font-size: 11px;
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
}
</style>
