<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ClipboardList } from 'lucide-vue-next'
import InventoryCompanySearchDialog from './components/InventoryCompanySearchDialog.vue'
import InventoryMaterialAddDialog from './components/InventoryMaterialAddDialog.vue'
import InventoryStockSummary from './components/InventoryStockSummary.vue'
import InventoryExcelSheet from './components/InventoryExcelSheet.vue'
import InventoryStampTable from './components/InventoryStampTable.vue'
import InventoryApprovedMaterialsDialog from './components/InventoryApprovedMaterialsDialog.vue'
import InventorySheetMenu from './components/InventorySheetMenu.vue'
import {
  INVENTORY_AUTH_REQUIRED,
  RAW_MATERIAL_TYPE,
  SUBSIDIARY_MATERIAL_TYPE,
  addCompanyInventoryMaterialItem,
  fetchAvailableCompanyMaterialItems,
  fetchInventoryCompanyMaterialItems,
  fetchInventoryEntryData,
  fetchInventoryStockSummary,
  fetchRecentInventoryTransactions,
  removeCompanyInventoryMaterialItem,
} from '@/features/inventory/services/inventory.service'
import { parseInventoryExcelFile } from '@/features/inventory/services/inventoryExcel.service'
import {
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
import { persistImportedColumns, persistNewColumn, persistSavedCell } from '@/features/inventory/sheet/persistSheetColumn'
import { formatApprovedMaterialsLabel } from '@/features/company/approvedMaterials'
import { updateCompanyApprovedMaterials } from '@/features/company/approvedMaterials.service'
import { useDialog } from '@/composables/useDialog'
import { useRoute, useRouter } from 'vue-router'
import { matchInventoryCompany } from '@/features/inventory/matchInventoryCompany'

const { alert, confirm } = useDialog()
const router = useRouter()
const route = useRoute()

const companies = ref([])
const materialItems = ref([])
const inboundColumns = ref([])
const outboundColumns = ref([])
const totalStockRows = ref([])
const selectedCompany = ref(null)
const activeMaterialLedgerTab = ref('raw')
const excelFileInput = ref(null)
const loading = ref(false)
const stockLoading = ref(false)
const ledgerLoading = ref(false)
const excelParsing = ref(false)
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

const materialLedgerTabs = [
  { key: 'raw', label: '원자재' },
  { key: 'subsidiary', label: '부자재' },
]

const isRawMaterialLedgerTab = computed(() => activeMaterialLedgerTab.value === 'raw')
const currentMaterialType = computed(() =>
  activeMaterialLedgerTab.value === 'subsidiary' ? SUBSIDIARY_MATERIAL_TYPE : RAW_MATERIAL_TYPE,
)
const currentMaterialLabel = computed(() => (isRawMaterialLedgerTab.value ? '원자재' : '부자재'))
const sheetMaterials = computed(() => materialsFromItems(materialItems.value))

const cellKey = (payload) =>
  `${payload.side}:${payload.column.localId}:${payload.field}:${payload.materialId ?? ''}`

const padCurrentSides = () => {
  inboundColumns.value = padEmptyColumns(inboundColumns.value, 'in', materialItems.value)
  outboundColumns.value = padEmptyColumns(outboundColumns.value, 'out', materialItems.value)
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
}

const addSheetColumn = (side) => {
  if (side === 'in') {
    inboundColumns.value = [...inboundColumns.value, createEmptyColumn('in', materialItems.value)]
    return
  }
  outboundColumns.value = [...outboundColumns.value, createEmptyColumn('out', materialItems.value)]
}

const applyLoadedColumns = (transactions) => {
  const split = splitTransactionsToColumns(transactions, materialItems.value)
  inboundColumns.value = padEmptyColumns(split.inboundColumns, 'in', materialItems.value)
  outboundColumns.value = padEmptyColumns(split.outboundColumns, 'out', materialItems.value)
}

const loadMainOverview = async () => {
  stockLoading.value = true
  try {
    totalStockRows.value = await fetchInventoryStockSummary(materialItems.value, null, RAW_MATERIAL_TYPE)
  } finally {
    stockLoading.value = false
  }
}

const loadCompanyLedger = async (company) => {
  selectedCompany.value = company
  ledgerLoading.value = true
  stockLoading.value = true
  clearSavedMessage()
  try {
    const companyMaterialItems = await fetchInventoryCompanyMaterialItems(company.id, currentMaterialType.value)
    materialItems.value = companyMaterialItems
    const savedTransactions = await fetchRecentInventoryTransactions(300, company.id, currentMaterialType.value)
    applyLoadedColumns(savedTransactions)
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
  inboundColumns.value = []
  outboundColumns.value = []
  activeMaterialLedgerTab.value = 'raw'
  clearSavedMessage()
  errorMessage.value = ''
  if (route.query.company || route.query.place || route.query.initial) {
    await router.replace({ name: 'inventory' })
  }
  const entryData = await fetchInventoryEntryData(RAW_MATERIAL_TYPE)
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

watch(activeMaterialLedgerTab, async () => {
  if (!selectedCompany.value) return
  materialAddDialogOpen.value = false
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
      <div class="flex shrink-0 flex-wrap items-center justify-between gap-3">
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
              <span class="text-orange-700">산출&입고</span>
            </template>
            <template v-else>입출고내역</template>
          </h1>
          <div v-if="selectedCompany" class="flex flex-wrap gap-1.5">
            <button
              v-for="tab in materialLedgerTabs"
              :key="tab.key"
              type="button"
              class="inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-extrabold transition-colors"
              :class="
                activeMaterialLedgerTab === tab.key
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              "
              @click="activeMaterialLedgerTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <div v-if="selectedCompany" class="flex shrink-0 items-center gap-2">
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
            등록
          </button>
        </div>
      </div>

      <div v-if="setupWarning" class="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
        {{ setupWarning }}
      </div>
      <div v-if="errorMessage" class="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
        {{ errorMessage }}
      </div>

      <InventoryStockSummary
        v-if="!selectedCompany"
        title="현재 총재고"
        description="전체 현장의 입출고 수량을 합산한 재고입니다."
        :rows="totalStockRows"
        :loading="loading || stockLoading"
      />

      <template v-else>
        <p v-if="ledgerLoading" class="text-sm font-bold text-slate-500">불러오는 중입니다.</p>
        <InventoryExcelSheet
          v-else
          class="min-h-0 flex-1"
          :materials="sheetMaterials"
          :inbound-columns="inboundColumns"
          :outbound-columns="outboundColumns"
          @start-edit="startCellEdit"
          @commit-edit="commitCellEdit"
          @cancel-edit="cancelCellEdit"
          @add-column="addSheetColumn"
        />
      </template>
    </section>

    <div
      v-if="savedMessage"
      class="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-extrabold text-white shadow-lg"
    >
      {{ savedMessage }}
    </div>

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
