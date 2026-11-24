<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/features/quality-list/quality.css'
import QualityFilters from '@/features/quality-list/components/QualityFilters.vue'
import QualityTable from '@/features/quality-list/components/QualityTable.vue'
import QualityDateTransferDialog from '@/features/quality-list/components/QualityDateTransferDialog.vue'
import QualityMergeDialog from '@/features/quality-list/components/QualityMergeDialog.vue'
import PrintSettingsDialog from '@/features/printing/PrintSettingsDialog.vue'
import MainPipeGroupingDialog from '@/features/quality-list/components/print/MainPipeGroupingDialog.vue'
import MainPipePrintTemplate from '@/features/quality-list/components/print/MainPipePrintTemplate.vue'
import BranchPipePrintTemplate from '@/features/quality-list/components/print/BranchPipePrintTemplate.vue'
import QualityListPrintTemplate from '@/features/quality-list/components/print/QualityListPrintTemplate.vue'
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
  assignQualityExpansion,
  updateLotEnd,
  updateLotRange,
  updateManualExpansion,
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
import { cancelFieldKey, returnFieldKey } from '@/features/quality-list/utils/countColumns'
import { type ManualExpansionInput } from '@/features/quality-list/utils/manualExpansion'
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
import type { QualityListRow, QualityLotInfo } from '@/features/quality-list/types/quality'
import type {
  BranchPipeItem,
  MainPipeGroupableGroup,
  MainPipeGroupItem,
  PrintEntryWithType,
} from '@/features/quality-list/types/print'
import { mapQualityListRow } from '@/features/quality-list/types/quality'
import { mergeQualityRows } from '@/features/quality-list/services/mergeQualityRows'
import { fetchQualityMergeBackups, undoQualityMerge } from '@/features/quality-list/services/qualityMergeBackup'

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
const mergeOpen = ref(false)
const mergeBusy = ref(false)
const mergeBackups = ref(new Map<number, number>())
const mergedIds = computed(() => new Set(mergeBackups.value.keys()))
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
    await refreshMergeBackups()
  } catch (error) {
    await alert(error instanceof Error ? error.message : '검수리스트를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

async function refreshMergeBackups() {
  mergeBackups.value = await fetchQualityMergeBackups(items.value.map((item) => item.id))
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
      lotRound: item.lotRound,
      lotName: item.lotNameH,
    })

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

    const model = buildNoticeCertificateModel(item, receipt?.receiptNum ?? '', receipt?.lotType || item.lotType)
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

function openMerge() {
  mergeOpen.value = true
}

function closeMerge() {
  if (mergeBusy.value) return
  mergeOpen.value = false
}

async function onMerge(rows: QualityListRow[], payload: { initial: string; area: string }) {
  if (rows.length < 2 || mergeBusy.value) return
  mergeBusy.value = true
  try {
    await mergeQualityRows(rows, payload)
    mergeOpen.value = false
    await refreshMergeBackups()
  } catch (error) {
    await alert(error instanceof Error ? error.message : '합치기에 실패했습니다.')
  } finally {
    mergeBusy.value = false
  }
}

async function onUndoMerge(item: QualityListRow) {
  const backupId = mergeBackups.value.get(item.id)
  if (!backupId) return
  if (!await confirm(`${item.company} ${item.place} 합치기를 취소할까요?`)) return
  try {
    await undoQualityMerge(backupId)
    await load()
  } catch (error) {
    await alert(error instanceof Error ? error.message : '합치기 취소에 실패했습니다.')
  }
}

async function onUpdateRange(item: QualityListRow, lotStart: number) {
  await updateLotRange(item, lotStart)
}

async function onUpdateLotEnd(item: QualityListRow, lotEnd: number) {
  const previous = items.value
  patchQualityRow(item.id, { lotNumEndH: lotEnd })
  try {
    await updateLotEnd(item.id, lotEnd)
  } catch (error) {
    items.value = previous
    await alert(error instanceof Error ? error.message : '끝번호를 저장하지 못했습니다.')
  }
}

async function onAssignExpansion(item: QualityListRow, payload: { round: string; lot: QualityLotInfo | null }) {
  try {
    await assignQualityExpansion(item, payload.round, payload.lot)
  } catch (error) {
    await alert(error instanceof Error ? error.message : '확관차수를 지정하지 못했습니다.')
  }
}

async function onSaveManual(item: QualityListRow, input: ManualExpansionInput) {
  const previous = items.value
  patchQualityRow(item.id, input)
  try {
    await updateManualExpansion(item, input)
  } catch (error) {
    items.value = previous
    await alert(error instanceof Error ? error.message : '수기입력을 저장하지 못했습니다.')
  }
}

function patchQualityRow(id: number, patch: Partial<QualityListRow>) {
  items.value = items.value.map((row) => (row.id === id ? { ...row, ...patch } : row))
}

async function onUpdateCancel(item: QualityListRow, field: QualityCountField, value: number) {
  const previous = items.value
  patchQualityRow(item.id, { [cancelFieldKey(field)]: value } as Partial<QualityListRow>)
  try {
    await updateCancelCount(item.id, field, value)
  } catch (error) {
    items.value = previous
    await alert(error instanceof Error ? error.message : '취소수량을 저장하지 못했습니다.')
  }
}

async function onToggleReturn(item: QualityListRow, field: QualityCountField, value: boolean) {
  const previous = items.value
  patchQualityRow(item.id, {
    [returnFieldKey(field)]: value,
    [cancelFieldKey(field)]: 0,
  } as Partial<QualityListRow>)
  try {
    await updateReturnFlag(item.id, field, value)
  } catch (error) {
    items.value = previous
    await alert(error instanceof Error ? error.message : '취소 표시를 저장하지 못했습니다.')
  }
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
        @merge="openMerge"
        @print="onPrint"
        @main-pipe-print="handleMainPipePrint"
        @branch-pipe-print="handleBranchPipePrint"
      />

      <QualityTable
        :items="items"
        :loading="loading"
        :show-all-records="showAllRecords"
        :can-reorder="canReorder"
        :merged-ids="mergedIds"
        @edit="goEdit"
        @delete="onDelete"
        @notification="onNoticeDownload"
        @stamp="onStamp"
        @update-range="onUpdateRange"
        @update-lot-end="onUpdateLotEnd"
        @assign-expansion="onAssignExpansion"
        @save-manual="onSaveManual"
        @update-cancel="onUpdateCancel"
        @toggle-return="onToggleReturn"
        @reorder="onReorder"
        @transfer="transferItem = $event"
        @undo-merge="onUndoMerge"
      />

      <QualityMergeDialog
        :open="mergeOpen"
        :items="items"
        :busy="mergeBusy"
        @close="closeMerge"
        @confirm="onMerge"
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

    <QualityListPrintTemplate
      :items="items"
      :title="currentDateLabel"
      :total="printTotal"
      :active="printMode === 'list'"
      :show-date="showAllRecords"
    />

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
}
</style>
