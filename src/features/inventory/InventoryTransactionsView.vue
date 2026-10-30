<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ClipboardList } from 'lucide-vue-next'
import InventoryCompanySearchDialog from './components/InventoryCompanySearchDialog.vue'
import InventoryMaterialAddDialog from './components/InventoryMaterialAddDialog.vue'
import InventoryStockSummary from './components/InventoryStockSummary.vue'
import InventoryExcelSheet from './components/InventoryExcelSheet.vue'
import InventorySummaryDashboard from './components/InventorySummaryDashboard.vue'
import InventoryMaterialTabs from './components/InventoryMaterialTabs.vue'
import InventoryStampTable from './components/InventoryStampTable.vue'
import InventoryApprovedMaterialsDialog from './components/InventoryApprovedMaterialsDialog.vue'
import InventorySheetMenu from './components/InventorySheetMenu.vue'
import InventoryQuantityExportDialog from './components/InventoryQuantityExportDialog.vue'
import InventoryQuantityHistoryDialog from './components/InventoryQuantityHistoryDialog.vue'
import {
  INVENTORY_AUTH_REQUIRED,
  RAW_MATERIAL_TYPE,
  SUBSIDIARY_MATERIAL_TYPE,
  addCompanyInventoryMaterialItem,
  fetchAvailableCompanyMaterialItems,
  fetchInventoryCompanyMaterialItems,
  fetchInventoryEntryData,
  fetchRecentInventoryTransactions,
  removeCompanyInventoryMaterialItem,
} from '@/features/inventory/services/inventory.service'
import { parseInventoryExcelFile } from '@/features/inventory/services/inventoryExcel.service'
import {
  downloadPreparedQuantitySheet,
  quantityExportColumnRows,
  quantitySheetDownloadName,
} from '@/features/inventory/quantity-export/quantitySheetExport'
import {
  deleteQuantitySheetHistory,
  fetchQuantitySheetHistory,
  saveQuantitySheetHistory,
} from '@/features/inventory/quantity-export/quantitySheetHistory.service'
import {
  buildQuantitySheetSnapshot,
  restoreQuantitySheet,
} from '@/features/inventory/quantity-export/quantitySheetSnapshot'
import { loadQuantityExportLedger } from '@/features/inventory/quantity-export/loadQuantityExportLedger'
import {
  columnHasDraftContent,
  columnHasQuantity,
  createEmptyColumn,
  materialsFromItems,
  padEmptyColumns,
  readSheetCellValue,
  rowsFromExcelParse,
  splitTransactionsToColumns,
  syncColumnQuantityKeys,
  writeSheetCellValue,
} from '@/features/inventory/sheet/mapTransactionsToSheet'
import { parseSheetDate } from '@/features/inventory/sheet/sheetDate'
import {
  deletePersistedSheetColumn,
  persistImportedColumns,
  persistNewColumn,
  persistSavedCell,
} from '@/features/inventory/sheet/persistSheetColumn'
import { formatApprovedMaterialsLabel } from '@/features/company/approvedMaterials'
import { updateCompanyApprovedMaterials } from '@/features/company/approvedMaterials.service'
import { useDialog } from '@/composables/useDialog'
import { useRoute, useRouter } from 'vue-router'
import { matchInventoryCompany } from '@/features/inventory/matchInventoryCompany'
import { buildShortageRows, buildWorkingZoneRows } from '@/features/inventory/summary/buildInventorySummary'
import { loadOverviewMaterialStock } from '@/features/inventory/summary/loadOverviewMaterialStock'
import { fetchOverviewPlans, fetchSitePlans } from '@/features/inventory/summary/fetchUncalculatedPlans'
import { splitUncalculatedPlans } from '@/features/inventory/summary/splitUncalculatedPlans'

const { alert, confirm } = useDialog()
const router = useRouter()
const route = useRoute()

const companies = ref([])
const materialItems = ref([])
const inboundColumns = ref([])
const outboundColumns = ref([])
const productionColumns = ref([])
const ledgerSection = ref('summary')
const totalStockRows = ref([])
const overviewShortageRows = ref([])
const overviewPlans = ref([])
const selectedCompany = ref(null)
const sitePlans = ref([])
const activeMaterialLedgerTab = ref('raw')
const overviewMaterial = ref('raw')
const overviewReady = ref(false)
let overviewStockRequest = 0
const excelFileInput = ref(null)
const loading = ref(false)
const stockLoading = ref(false)
const ledgerLoading = ref(false)
const excelParsing = ref(false)
const quantityExportOpen = ref(false)
const quantityExporting = ref(false)
const quantityHistoryOpen = ref(false)
const quantityHistoryLoading = ref(false)
const quantityHistoryRows = ref([])
const quantityHistoryDownloadingId = ref('')
const quantityHistoryDeletingId = ref('')
const registerDialogOpen = ref(false)
const approvedMaterialsDialogOpen = ref(false)
const approvedMaterialsSaving = ref(false)
const materialAddDialogOpen = ref(false)
const materialAddLoading = ref(false)
const materialActionItemId = ref('')
const availableMaterialItems = ref([])
const savingCell = ref('')
const setupWarning = ref('')
const errorMessage = ref('')
const savedMessage = ref('')
let savedMessageTimer = null
const cellSnapshots = new Map()

const showSavedMessage = (text) => {
  savedMessage.value = text
  clearTimeout(savedMessageTimer)
  savedMessageTimer = setTimeout(() => {
    savedMessage.value = ''
  }, 1800)
}

const clearSavedMessage = () => {
  clearTimeout(savedMessageTimer)
  savedMessage.value = ''
}

const selectedCompanyName = computed(() =>
  [selectedCompany.value?.company, selectedCompany.value?.place].filter(Boolean).join(' '),
)

const sheetStamps = computed(() => [
  {
    key: 'approved-materials',
    label: '승인자재',
    value: formatApprovedMaterialsLabel(selectedCompany.value?.approvedMaterials),
    width: 'w-36',
    editable: true,
  },
  { label: '담당자', value: selectedCompany.value?.managerName || '' },
  { label: '검토', value: '' },
  { label: '승인', value: '' },
])

const isRawMaterialLedgerTab = computed(() => activeMaterialLedgerTab.value === 'raw')
const currentMaterialType = computed(() =>
  activeMaterialLedgerTab.value === 'subsidiary' ? SUBSIDIARY_MATERIAL_TYPE : RAW_MATERIAL_TYPE,
)
const materialStatusTitle = (material) => (material === 'subsidiary' ? '부자재 현황' : '원자재 현황')
const currentMaterialLabel = computed(() => (isRawMaterialLedgerTab.value ? '원자재' : '부자재'))
const overviewStatusTitle = computed(() => materialStatusTitle(overviewMaterial.value))
const ledgerStatusTitle = computed(() => materialStatusTitle(activeMaterialLedgerTab.value))
const ledgerSectionLabel = computed(() => {
  if (ledgerSection.value === 'summary') return '총괄'
  if (ledgerSection.value === 'production') return '생산'
  if (ledgerSection.value === 'out') return '산출'
  return '입고'
})
const sheetMaterials = computed(() => materialsFromItems(materialItems.value))
const shortageRows = computed(() => buildShortageRows(sheetMaterials.value, inboundColumns.value, outboundColumns.value))
const uncalculatedSplit = computed(() => splitUncalculatedPlans(sitePlans.value))
const uncalculatedRows = computed(() => uncalculatedSplit.value.all)
const uncalculatedWorkRows = computed(() => uncalculatedSplit.value.started)
const overviewPlanSplit = computed(() => splitUncalculatedPlans(overviewPlans.value))
const overviewUncalculatedRows = computed(() => overviewPlanSplit.value.all)
const overviewUncalculatedWorkRows = computed(() => overviewPlanSplit.value.started)
const workingZoneRows = computed(() => buildWorkingZoneRows(outboundColumns.value, sitePlans.value))
const quantityExportRows = computed(() => quantityExportColumnRows(outboundColumns.value))

const cellKey = (payload) =>
  `${payload.side}:${payload.column.localId}:${payload.field}:${payload.materialId ?? ''}`

const padCurrentSides = () => {
  inboundColumns.value = padEmptyColumns(inboundColumns.value, 'in', materialItems.value)
  outboundColumns.value = padEmptyColumns(outboundColumns.value, 'out', materialItems.value)
  productionColumns.value = padEmptyColumns(productionColumns.value, 'out', materialItems.value)
}

const startCellEdit = (payload) => {
  cellSnapshots.set(cellKey(payload), readSheetCellValue(payload.column, payload.field, payload.materialId))
}

const cancelCellEdit = (payload) => {
  if (!payload) return
  const key = cellKey(payload)
  if (!cellSnapshots.has(key)) return
  writeSheetCellValue(payload.column, payload.field, payload.materialId, cellSnapshots.get(key))
  cellSnapshots.delete(key)
}

const columnsRefForSide = (side) => {
  if (side === 'in') return inboundColumns
  if (side === 'production') return productionColumns
  return outboundColumns
}

const removeSheetColumn = async (side, column, key, previous, materialId) => {
  savingCell.value = key
  try {
    if (side !== 'production') await deletePersistedSheetColumn(column)
    const list = columnsRefForSide(side)
    list.value = padEmptyColumns(
      list.value.filter((item) => item.localId !== column.localId),
      side === 'in' ? 'in' : 'out',
      materialItems.value,
    )
  } catch (error) {
    writeSheetCellValue(column, 'date', materialId, previous)
    await handleSaveError(error, '입출고 내역 삭제에 실패했습니다.')
  } finally {
    savingCell.value = ''
  }
}

const commitCellEdit = async (payload) => {
  const { column, field, materialId, side } = payload
  const key = cellKey(payload)
  if (!cellSnapshots.has(key) || savingCell.value === key) return

  const previous = String(cellSnapshots.get(key) ?? '').trim()
  const nextValue = String(readSheetCellValue(column, field, materialId) ?? '').trim()
  cellSnapshots.delete(key)

  if (field === 'date' && nextValue && !parseSheetDate(nextValue)) {
    writeSheetCellValue(column, field, materialId, previous)
    return
  }

  if (field === 'date' && !nextValue) {
    if (!previous || (!column.saved && !columnHasDraftContent(column))) return
    await removeSheetColumn(side, column, key, previous, materialId)
    return
  }

  if (side === 'production') return
  if (previous === nextValue && column.saved) return
  if (!column.saved && !columnHasQuantity(column)) return
  if (!selectedCompany.value) return

  savingCell.value = key
  try {
    if (!column.saved) {
      const { inserted } = await persistNewColumn(
        side,
        column,
        materialItems.value,
        selectedCompany.value,
        currentMaterialType.value,
      )
      if (inserted || previous === nextValue) return
    }

    if (previous === nextValue) return
    await persistSavedCell({ column, field, materialId, side })
  } catch (error) {
    writeSheetCellValue(column, field, materialId, previous)
    await handleSaveError(error, '입출고 내역 저장에 실패했습니다.')
  } finally {
    savingCell.value = ''
  }
}

const compareMaterialItems = (left, right) => {
  const sortCompare = Number(left?.sort_order ?? 0) - Number(right?.sort_order ?? 0)
  if (sortCompare !== 0) return sortCompare
  const groupCompare = String(left?.material_group ?? '').localeCompare(String(right?.material_group ?? ''), 'ko')
  if (groupCompare !== 0) return groupCompare
  return String(left?.spec ?? '').localeCompare(String(right?.spec ?? ''), 'ko', { numeric: true })
}

const setAvailableMaterialLinked = (materialId, isLinkedToCompany) => {
  availableMaterialItems.value = availableMaterialItems.value.map((target) =>
    String(target.id) === String(materialId) ? { ...target, isLinkedToCompany } : target,
  )
}

const syncColumns = () => {
  inboundColumns.value = syncColumnQuantityKeys(inboundColumns.value, materialItems.value)
  outboundColumns.value = syncColumnQuantityKeys(outboundColumns.value, materialItems.value)
  productionColumns.value = syncColumnQuantityKeys(productionColumns.value, materialItems.value)
}

const addMaterialToCurrentLedger = (item) => {
  if (!materialItems.value.some((target) => String(target.id) === String(item.id))) {
    materialItems.value = [...materialItems.value, item].sort(compareMaterialItems)
  }
  syncColumns()
  padCurrentSides()
}

const removeMaterialFromCurrentLedger = (materialId) => {
  const targetId = String(materialId)
  materialItems.value = materialItems.value.filter((item) => String(item.id) !== targetId)
  const strip = (column) => {
    const { [targetId]: _removed, ...nextQuantities } = column.quantities ?? {}
    return { ...column, quantities: nextQuantities }
  }
  inboundColumns.value = inboundColumns.value.map(strip)
  outboundColumns.value = outboundColumns.value.map(strip)
  productionColumns.value = productionColumns.value.map(strip)
}

const addSheetColumn = (side) => {
  if (side === 'in') {
    inboundColumns.value = [...inboundColumns.value, createEmptyColumn('in', materialItems.value)]
    return
  }
  if (side === 'production') {
    productionColumns.value = [...productionColumns.value, createEmptyColumn('out', materialItems.value)]
    return
  }
  outboundColumns.value = [...outboundColumns.value, createEmptyColumn('out', materialItems.value)]
}

const applyLoadedColumns = (transactions) => {
  const split = splitTransactionsToColumns(transactions, materialItems.value)
  inboundColumns.value = padEmptyColumns(split.inboundColumns, 'in', materialItems.value)
  outboundColumns.value = padEmptyColumns(split.outboundColumns, 'out', materialItems.value)
  productionColumns.value = padEmptyColumns([], 'out', materialItems.value)
}

const overviewMaterialType = () =>
  overviewMaterial.value === 'subsidiary' ? SUBSIDIARY_MATERIAL_TYPE : RAW_MATERIAL_TYPE

const loadMainOverview = async () => {
  const request = ++overviewStockRequest
  stockLoading.value = true
  try {
    const [stock, plans] = await Promise.all([
      loadOverviewMaterialStock(materialItems.value, overviewMaterialType()),
      fetchOverviewPlans(),
    ])
    if (request !== overviewStockRequest) return
    totalStockRows.value = stock.stockRows
    overviewShortageRows.value = stock.shortageRows
    overviewPlans.value = plans
    overviewReady.value = true
  } finally {
    if (request === overviewStockRequest) stockLoading.value = false
  }
}

const changeOverviewMaterial = async (material) => {
  if (selectedCompany.value || material === overviewMaterial.value) return
  overviewMaterial.value = material
  errorMessage.value = ''
  const request = ++overviewStockRequest
  stockLoading.value = true
  overviewShortageRows.value = []
  try {
    const entryData = await fetchInventoryEntryData(overviewMaterialType())
    if (request !== overviewStockRequest || selectedCompany.value) return
    materialItems.value = entryData.materialItems
    setupWarning.value = entryData.setupWarning
    const stock = await loadOverviewMaterialStock(entryData.materialItems, overviewMaterialType())
    if (request !== overviewStockRequest || selectedCompany.value) return
    totalStockRows.value = stock.stockRows
    overviewShortageRows.value = stock.shortageRows
  } catch (error) {
    if (request !== overviewStockRequest) return
    errorMessage.value = error instanceof Error ? error.message : '입출고 데이터를 불러오지 못했습니다.'
  } finally {
    if (request === overviewStockRequest) stockLoading.value = false
  }
}

const loadCompanyLedger = async (company) => {
  selectedCompany.value = company
  ledgerLoading.value = true
  stockLoading.value = true
  clearSavedMessage()
  try {
    const [companyMaterialItems, savedTransactions, plans] = await Promise.all([
      fetchInventoryCompanyMaterialItems(company.id, currentMaterialType.value),
      fetchRecentInventoryTransactions(300, company.id, currentMaterialType.value),
      fetchSitePlans(company),
    ])
    materialItems.value = companyMaterialItems
    applyLoadedColumns(savedTransactions)
    sitePlans.value = plans
  } finally {
    ledgerLoading.value = false
    stockLoading.value = false
  }
}

const applyRouteCompany = async (companyList) => {
  const queryRow = {
    company: String(route.query.company ?? '').trim(),
    place: String(route.query.place ?? '').trim(),
    initial: String(route.query.initial ?? '').trim(),
  }
  if (!queryRow.company && !queryRow.place && !queryRow.initial) return false
  const matched = matchInventoryCompany(companyList, queryRow)
  if (!matched) return false
  await loadCompanyLedger(matched)
  return true
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  clearSavedMessage()
  try {
    const entryData = await fetchInventoryEntryData(RAW_MATERIAL_TYPE)
    companies.value = entryData.companies
    materialItems.value = entryData.materialItems
    setupWarning.value = entryData.setupWarning
    const openedFromPlan = await applyRouteCompany(entryData.companies)
    if (openedFromPlan) return
    if (selectedCompany.value) await loadCompanyLedger(selectedCompany.value)
    else await loadMainOverview()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '입출고 데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

const openRegisterDialog = () => {
  clearSavedMessage()
  registerDialogOpen.value = true
}

const openApprovedMaterialsDialog = () => {
  approvedMaterialsDialogOpen.value = true
}

const saveApprovedMaterials = async (names) => {
  if (!selectedCompany.value?.id) return
  approvedMaterialsSaving.value = true
  try {
    const approvedMaterials = await updateCompanyApprovedMaterials(selectedCompany.value.id, names)
    selectedCompany.value = { ...selectedCompany.value, approvedMaterials }
    companies.value = companies.value.map((company) =>
      company.id === selectedCompany.value.id ? { ...company, approvedMaterials } : company,
    )
    approvedMaterialsDialogOpen.value = false
  } catch (error) {
    await alert(error instanceof Error ? error.message : '승인자재를 저장하지 못했습니다.')
  } finally {
    approvedMaterialsSaving.value = false
  }
}

const selectCompanyForEntry = async (company) => {
  registerDialogOpen.value = false
  errorMessage.value = ''
  try {
    await loadCompanyLedger(company)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '현장 입출고 내역을 불러오지 못했습니다.'
  }
}

const goBackToOverview = async () => {
  selectedCompany.value = null
  sitePlans.value = []
  overviewPlans.value = []
  overviewShortageRows.value = []
  overviewReady.value = false
  inboundColumns.value = []
  outboundColumns.value = []
  productionColumns.value = []
  ledgerSection.value = 'summary'
  activeMaterialLedgerTab.value = 'raw'
  clearSavedMessage()
  errorMessage.value = ''
  if (route.query.company || route.query.place || route.query.initial) {
    await router.replace({ name: 'inventory' })
  }
  const entryData = await fetchInventoryEntryData(overviewMaterialType())
  materialItems.value = entryData.materialItems
  setupWarning.value = entryData.setupWarning
  await loadMainOverview()
}

const openMaterialAddDialog = async () => {
  if (!selectedCompany.value) {
    await alert('현장을 먼저 선택해주세요.')
    return
  }

  materialAddDialogOpen.value = true
  materialAddLoading.value = true
  availableMaterialItems.value = []
  try {
    availableMaterialItems.value = await fetchAvailableCompanyMaterialItems(selectedCompany.value.id, currentMaterialType.value)
  } catch (error) {
    await alert(error instanceof Error ? error.message : `${currentMaterialLabel.value} 목록을 불러오지 못했습니다.`)
    materialAddDialogOpen.value = false
  } finally {
    materialAddLoading.value = false
  }
}

const selectMaterialToAdd = async (item) => {
  if (!selectedCompany.value || !item?.id) return
  if (materialActionItemId.value) return

  const confirmed = await confirm(
    `${currentMaterialLabel.value} ${item.material_group} ${item.spec} 항목을 이 현장에 추가할까요?`,
    { confirmText: '추가', cancelText: '취소' },
  )
  if (!confirmed) return

  materialActionItemId.value = String(item.id)
  try {
    await addCompanyInventoryMaterialItem(selectedCompany.value.id, item.id, currentMaterialType.value)
    setAvailableMaterialLinked(item.id, true)
    addMaterialToCurrentLedger({ ...item, isLinkedToCompany: true })
    showSavedMessage(`${currentMaterialLabel.value} ${item.material_group} ${item.spec} 항목을 추가했습니다.`)
  } catch (error) {
    await alert(error instanceof Error ? error.message : `${currentMaterialLabel.value} 항목 추가에 실패했습니다.`)
  } finally {
    materialActionItemId.value = ''
  }
}

const selectMaterialToRemove = async (item) => {
  if (!selectedCompany.value || !item?.id) return
  if (materialActionItemId.value) return

  const confirmed = await confirm(
    `${currentMaterialLabel.value} ${item.material_group} ${item.spec} 항목을 이 현장에서 제외할까요?`,
    { confirmText: '제외', cancelText: '취소' },
  )
  if (!confirmed) return

  materialActionItemId.value = String(item.id)
  try {
    await removeCompanyInventoryMaterialItem(selectedCompany.value.id, item.id, currentMaterialType.value)
    setAvailableMaterialLinked(item.id, false)
    removeMaterialFromCurrentLedger(item.id)
    showSavedMessage(`${currentMaterialLabel.value} ${item.material_group} ${item.spec} 항목을 제외했습니다.`)
  } catch (error) {
    await alert(error instanceof Error ? error.message : `${currentMaterialLabel.value} 항목 제외에 실패했습니다.`)
  } finally {
    materialActionItemId.value = ''
  }
}

const handleSaveError = async (error, fallbackMessage) => {
  const message = error instanceof Error ? error.message : fallbackMessage
  await alert(message)
  if (error?.code === INVENTORY_AUTH_REQUIRED) {
    await router.push({ name: 'login' })
  }
}

const openExcelFilePicker = async () => {
  if (!selectedCompany.value) {
    await alert('현장을 먼저 선택해주세요.')
    return
  }
  excelFileInput.value?.click()
}

const quantitySheetFileName = (columns) =>
  quantitySheetDownloadName({
    company: selectedCompany.value?.company,
    place: selectedCompany.value?.place,
    columns,
  })

const loadQuantityHistory = async () => {
  if (!selectedCompany.value?.id) return
  quantityHistoryLoading.value = true
  try {
    quantityHistoryRows.value = await fetchQuantitySheetHistory(
      selectedCompany.value.id,
      currentMaterialType.value,
    )
  } catch (error) {
    quantityHistoryRows.value = []
    await alert(error instanceof Error ? error.message : '산출서 내역을 불러오지 못했습니다.')
  } finally {
    quantityHistoryLoading.value = false
  }
}

const openQuantityHistory = () => {
  quantityHistoryOpen.value = true
  void loadQuantityHistory()
}

const createQuantitySheet = async (localIds) => {
  const selected = new Set(localIds)
  const columns = outboundColumns.value.filter((column) => selected.has(column.localId))
  if (!columns.length || !selectedCompany.value?.id) return

  quantityExporting.value = true
  try {
    const siteName = [selectedCompany.value.company, selectedCompany.value.place].filter(Boolean).join(' / ')
    const otherType = currentMaterialType.value === RAW_MATERIAL_TYPE ? SUBSIDIARY_MATERIAL_TYPE : RAW_MATERIAL_TYPE
    const otherLedger = await loadQuantityExportLedger(selectedCompany.value.id, otherType)
    const snapshot = buildQuantitySheetSnapshot({
      columns,
      materials: sheetMaterials.value,
      companions: [otherLedger],
    })
    await saveQuantitySheetHistory({
      companyId: selectedCompany.value.id,
      materialType: currentMaterialType.value,
      siteName,
      columns: snapshot,
    })
    const restored = restoreQuantitySheet({ siteName, columns: snapshot })
    await downloadPreparedQuantitySheet({
      ...restored,
      designerName: selectedCompany.value.managerName,
      fileName: quantitySheetFileName(columns),
    })
    quantityExportOpen.value = false
  } catch (error) {
    await alert(error instanceof Error ? error.message : '산출서를 만들지 못했습니다.')
  } finally {
    quantityExporting.value = false
  }
}

const downloadSavedQuantitySheet = async (row) => {
  quantityHistoryDownloadingId.value = row.id
  try {
    const restored = restoreQuantitySheet(row)
    await downloadPreparedQuantitySheet({
      ...restored,
      designerName: selectedCompany.value?.managerName,
      fileName: quantitySheetFileName(restored.columns),
    })
    showSavedMessage('다운로드가 완료되었습니다.')
  } catch (error) {
    await alert(error instanceof Error ? error.message : '산출서를 만들지 못했습니다.')
  } finally {
    quantityHistoryDownloadingId.value = ''
  }
}

const deleteSavedQuantitySheet = async (row) => {
  quantityHistoryDeletingId.value = row.id
  try {
    await deleteQuantitySheetHistory(row.id)
    quantityHistoryRows.value = quantityHistoryRows.value.filter((item) => item.id !== row.id)
  } catch (error) {
    await alert(error instanceof Error ? error.message : '산출서 내역을 삭제하지 못했습니다.')
  } finally {
    quantityHistoryDeletingId.value = ''
  }
}

const handleExcelFileChange = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  excelParsing.value = true
  errorMessage.value = ''
  clearSavedMessage()
  try {
    const result = await parseInventoryExcelFile(file, materialItems.value, currentMaterialType.value)
    if (result.rows.length === 0) {
      await alert('엑셀에서 가져올 입출고 내역이 없습니다.')
      return
    }
    const parsed = rowsFromExcelParse(result.rows, materialItems.value)
    const savedIds = await persistImportedColumns(
      parsed.inboundColumns,
      parsed.outboundColumns,
      materialItems.value,
      selectedCompany.value,
      currentMaterialType.value,
    )
    await loadCompanyLedger(selectedCompany.value)
    const warningText = result.warnings.length > 0 ? ` 제외된 항목: ${result.warnings.join(' / ')}` : ''
    showSavedMessage(`${file.name}에서 ${savedIds.length}건을 저장했습니다.${warningText}`)
  } catch (error) {
    await alert(error instanceof Error ? error.message : '엑셀 파일을 읽지 못했습니다.')
  } finally {
    excelParsing.value = false
  }
}

onMounted(() => {
  void load()
})

onBeforeUnmount(() => {
  clearTimeout(savedMessageTimer)
})

watch(ledgerSection, (section) => {
  if (section !== 'out') {
    quantityExportOpen.value = false
    quantityHistoryOpen.value = false
  }
})

watch(activeMaterialLedgerTab, async () => {
  if (!selectedCompany.value) return
  materialAddDialogOpen.value = false
  quantityExportOpen.value = false
  quantityHistoryOpen.value = false
  availableMaterialItems.value = []
  errorMessage.value = ''
  clearSavedMessage()
  try {
    await loadCompanyLedger(selectedCompany.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '현장 입출고 내역을 불러오지 못했습니다.'
  }
})

watch(
  () => [route.query.company, route.query.place, route.query.initial],
  async () => {
    if (!companies.value.length) return
    try {
      await applyRouteCompany(companies.value)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '현장 입출고 내역을 불러오지 못했습니다.'
    }
  },
)
</script>

<template>
  <main
    :class="selectedCompany
      ? 'flex h-[calc(100vh-56px)] flex-col bg-white px-4 pt-3 md:h-[calc(100vh-72px)] md:px-6'
      : 'min-h-screen bg-slate-50 px-4 py-5 md:px-6'"
  >
    <section class="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3">
      <div
        class="flex shrink-0 flex-wrap items-center justify-between gap-3"
        :class="selectedCompany ? '' : 'sticky top-[56px] z-30 -mx-4 bg-slate-50 px-4 py-3 md:top-[72px] md:-mx-6 md:px-6'"
      >
        <div class="flex min-w-0 items-center gap-3">
          <button
            v-if="selectedCompany"
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            title="입출고내역"
            aria-label="입출고내역"
            @click="goBackToOverview"
          >
            <ArrowLeft class="h-4 w-4" />
          </button>
          <h1 class="truncate text-2xl font-extrabold text-slate-900">
            <template v-if="selectedCompany">
              {{ selectedCompanyName }}
              <span class="text-orange-700">{{ currentMaterialLabel }} {{ ledgerSectionLabel }}</span>
            </template>
            <template v-else>입출고내역</template>
          </h1>
          <InventoryMaterialTabs
            v-if="selectedCompany"
            :material="activeMaterialLedgerTab"
            :section="ledgerSection"
            @update:material="activeMaterialLedgerTab = $event"
            @update:section="ledgerSection = $event"
          />
          <InventoryMaterialTabs
            v-else
            :material="overviewMaterial"
            :show-sections="false"
            @update:material="changeOverviewMaterial"
          />
        </div>

        <div v-if="selectedCompany" class="flex shrink-0 items-center gap-2">
          <button
            v-if="ledgerSection === 'out'"
            type="button"
            class="inline-flex h-10 items-center rounded-xl border border-orange-300 bg-white px-3 text-sm font-extrabold text-orange-800 hover:bg-orange-50"
            @click="quantityExportOpen = true"
          >
            엑셀출력
          </button>
          <button
            v-if="ledgerSection === 'out'"
            type="button"
            class="inline-flex h-10 items-center rounded-xl border border-orange-300 bg-white px-3 text-sm font-extrabold text-orange-800 hover:bg-orange-50"
            @click="openQuantityHistory"
          >
            산출서 내역
          </button>
          <InventoryStampTable :items="sheetStamps" @edit="openApprovedMaterialsDialog" />
          <input
            ref="excelFileInput"
            type="file"
            class="hidden"
            accept=".xls,.xlsx"
            @change="handleExcelFileChange"
          />
          <InventorySheetMenu
            :material-label="currentMaterialLabel"
            :excel-parsing="excelParsing"
            :excel-disabled="Boolean(setupWarning)"
            @add-material="openMaterialAddDialog"
            @upload-excel="openExcelFilePicker"
          />
        </div>

        <div v-else class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white hover:bg-slate-800"
            @click="openRegisterDialog"
          >
            <ClipboardList class="h-4 w-4" />
            등록&조회
          </button>
        </div>
      </div>

      <div v-if="setupWarning" class="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
        {{ setupWarning }}
      </div>
      <div v-if="errorMessage" class="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
        {{ errorMessage }}
      </div>

      <template v-if="!selectedCompany">
        <InventoryStockSummary
          :title="overviewStatusTitle"
          description="전체 현장의 입출고 수량을 합산한 재고입니다."
          :rows="totalStockRows"
          :loading="loading || stockLoading"
        />
        <InventorySummaryDashboard
          v-if="!loading && overviewReady"
          :uncalculated-rows="overviewUncalculatedRows"
          :uncalculated-work-rows="overviewUncalculatedWorkRows"
          :show-working="false"
          :show-shortage="false"
          show-site
        />
      </template>

      <template v-else>
        <p v-if="ledgerLoading" class="text-sm font-bold text-slate-500">불러오는 중입니다.</p>
        <InventorySummaryDashboard
          v-else-if="ledgerSection === 'summary'"
          :status-title="ledgerStatusTitle"
          :shortage-rows="shortageRows"
          :uncalculated-rows="uncalculatedRows"
          :uncalculated-work-rows="uncalculatedWorkRows"
          :working-rows="workingZoneRows"
        />
        <InventoryExcelSheet
          v-else
          class="min-h-0 flex-1"
          :materials="sheetMaterials"
          :mode="ledgerSection"
          :inbound-columns="inboundColumns"
          :outbound-columns="outboundColumns"
          @start-edit="startCellEdit"
          @commit-edit="commitCellEdit"
          @cancel-edit="cancelCellEdit"
          @add-column="addSheetColumn"
        />
      </template>
    </section>

    <Teleport to="body">
      <div
        v-if="savedMessage"
        class="pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-extrabold text-white shadow-lg"
      >
        {{ savedMessage }}
      </div>
    </Teleport>

    <InventoryCompanySearchDialog
      v-if="registerDialogOpen"
      :companies="companies"
      title="현장 선택"
      @close="registerDialogOpen = false"
      @select="selectCompanyForEntry"
    />

    <InventoryApprovedMaterialsDialog
      :open="approvedMaterialsDialogOpen"
      :names="selectedCompany?.approvedMaterials || []"
      :saving="approvedMaterialsSaving"
      @close="approvedMaterialsDialogOpen = false"
      @save="saveApprovedMaterials"
    />

    <InventoryQuantityExportDialog
      :open="quantityExportOpen"
      :rows="quantityExportRows"
      :creating="quantityExporting"
      @close="quantityExportOpen = false"
      @create="createQuantitySheet"
    />

    <InventoryQuantityHistoryDialog
      :open="quantityHistoryOpen"
      :rows="quantityHistoryRows"
      :loading="quantityHistoryLoading"
      :downloading-id="quantityHistoryDownloadingId"
      :deleting-id="quantityHistoryDeletingId"
      @close="quantityHistoryOpen = false"
      @download="downloadSavedQuantitySheet"
      @delete="deleteSavedQuantitySheet"
    />

    <InventoryMaterialAddDialog
      :open="materialAddDialogOpen"
      :title="`${currentMaterialLabel} 항목 추가`"
      :items="availableMaterialItems"
      :loading="materialAddLoading"
      :saving-item-id="materialActionItemId"
      @close="materialAddDialogOpen = false"
      @select="selectMaterialToAdd"
      @remove="selectMaterialToRemove"
    />
  </main>
</template>
