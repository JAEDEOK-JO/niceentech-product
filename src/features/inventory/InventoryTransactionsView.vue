<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ArrowLeft, ClipboardList, Loader2, Plus, Save, Search, Trash2, Upload } from 'lucide-vue-next'
import InventoryCompanySearchDialog from './components/InventoryCompanySearchDialog.vue'
import InventoryQuickLookupDialog from './components/InventoryQuickLookupDialog.vue'
import InventoryStockSummary from './components/InventoryStockSummary.vue'
import InventoryStockTotalsTable from './components/InventoryStockTotalsTable.vue'
import {
  INVENTORY_AUTH_REQUIRED,
  fetchInventoryEntryData,
  fetchInventoryStockSummary,
  fetchInventoryStockTotals,
  fetchRecentInventoryTransactions,
  saveInventorySheetRows,
  updateInventoryTransactionHeader,
  updateInventoryTransactionItemQuantity,
} from '@/features/inventory/services/inventory.service'
import { parseInventoryExcelFile } from '@/features/inventory/services/inventoryExcel.service'
import { useDialog } from '@/composables/useDialog'
import { useRouter } from 'vue-router'

const { alert } = useDialog()
const router = useRouter()

const companies = ref([])
const materialItems = ref([])
const sheetRows = ref([])
const totalStockRows = ref([])
const companyStockTotals = ref([])
const selectedCompany = ref(null)
const excelFileInput = ref(null)
const sheetScroll = ref(null)
const loading = ref(false)
const stockLoading = ref(false)
const ledgerLoading = ref(false)
const saving = ref(false)
const savingCell = ref('')
const excelParsing = ref(false)
const registerDialogOpen = ref(false)
const quickLookupOpen = ref(false)
const editingCell = ref(null)
const editingValue = ref('')
const setupWarning = ref('')
const errorMessage = ref('')
const savedMessage = ref('')

let rowSeq = 0

const selectedCompanyName = computed(() =>
  [selectedCompany.value?.company, selectedCompany.value?.place].filter(Boolean).join(' '),
)

const inventoryPageTitle = computed(() =>
  selectedCompany.value ? `${selectedCompanyName.value} 입출고내역` : '입출고내역',
)

const hasUnsavedRows = computed(() => sheetRows.value.some((row) => !row.saved))

const getTodayIso = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createQuantityMap = () =>
  Object.fromEntries(materialItems.value.map((item) => [String(item.id), '']))

const createSheetRow = () => ({
  localId: `row-${++rowSeq}`,
  saved: false,
  transactionDate: getTodayIso(),
  transactionType: 'incoming',
  memo: '',
  manufacturer: '',
  supplier: '',
  quantities: createQuantityMap(),
})

const groupedMaterialItems = computed(() => {
  const groups = []
  for (const item of materialItems.value) {
    const groupName = String(item.material_group || item.name || '기타')
    let group = groups.find((target) => target.name === groupName)
    if (!group) {
      group = { name: groupName, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
})

const sheetMinWidth = computed(() => 610 + materialItems.value.length * 70)

const groupColorThemes = [
  { header: '#fee2e2', sub: '#fef2f2', text: '#7f1d1d', headerText: '#7f1d1d' },
  { header: '#ffedd5', sub: '#fff7ed', text: '#7c2d12', headerText: '#7c2d12' },
  { header: '#fef9c3', sub: '#fefce8', text: '#713f12', headerText: '#713f12' },
  { header: '#dcfce7', sub: '#f0fdf4', text: '#14532d', headerText: '#14532d' },
  { header: '#dbeafe', sub: '#eff6ff', text: '#1e3a8a', headerText: '#1e3a8a' },
  { header: '#e0e7ff', sub: '#eef2ff', text: '#312e81', headerText: '#312e81' },
  { header: '#f3e8ff', sub: '#faf5ff', text: '#581c87', headerText: '#581c87' },
]
const sheetBorderColor = '#e2e8f0'
const groupDividerColor = '#111827'

const getGroupTheme = (groupIndex) => groupColorThemes[groupIndex % groupColorThemes.length]

const groupHeaderStyle = (groupIndex) => {
  const theme = getGroupTheme(groupIndex)
  return {
    backgroundColor: theme.header,
    borderLeftColor: groupIndex > 0 ? groupDividerColor : sheetBorderColor,
    borderRightColor: sheetBorderColor,
    color: theme.headerText,
  }
}

const groupSubHeaderStyle = (groupIndex) => {
  const theme = getGroupTheme(groupIndex)
  return {
    backgroundColor: theme.sub,
    color: theme.text,
  }
}

const groupBodyCellStyle = () => ({
  backgroundColor: '#ffffff',
})

const groupBoundaryStyle = (groupIndex) => ({
  borderLeftColor: groupIndex > 0 ? groupDividerColor : sheetBorderColor,
})

const isFirstGroupItem = (itemIndex) => itemIndex === 0

const syncRowQuantityKeys = () => {
  for (const row of sheetRows.value) {
    const next = { ...row.quantities }
    for (const item of materialItems.value) {
      const key = String(item.id)
      if (!(key in next)) next[key] = ''
    }
    row.quantities = next
  }
}

const resetSheetRows = () => {
  sheetRows.value = []
}

const addSheetRow = () => {
  sheetRows.value = [...sheetRows.value, createSheetRow()]
  void nextTick(() => {
    const target = sheetScroll.value
    if (target) target.scrollTop = target.scrollHeight
    const page = document.scrollingElement || document.documentElement
    page.scrollTop = page.scrollHeight
  })
}

const addRowsToSheet = (rows) => {
  const nextRows = rows.map((row) => ({
    ...row,
    localId: `row-${++rowSeq}`,
    saved: false,
    quantities: {
      ...createQuantityMap(),
      ...(row.quantities ?? {}),
    },
  }))
  sheetRows.value = [...sheetRows.value, ...nextRows]
}

const compareTransactionsByDateAsc = (left, right) => {
  const dateCompare = String(left?.transaction_date ?? '').localeCompare(String(right?.transaction_date ?? ''))
  if (dateCompare !== 0) return dateCompare
  return toNumber(left?.id) - toNumber(right?.id)
}

const createSavedSheetRows = (transactions) =>
  [...(transactions ?? [])].sort(compareTransactionsByDateAsc).map((transaction) => {
    const quantities = createQuantityMap()
    for (const item of transaction.items ?? []) {
      quantities[String(item.material_item_id)] = String(item.quantity)
    }

    return {
      localId: `saved-${transaction.id}`,
      transactionId: transaction.id,
      saved: true,
      transactionDate: transaction.transaction_date,
      transactionType: transaction.transaction_type,
      memo: transaction.memo ?? '',
      manufacturer: transaction.manufacturer ?? '',
      supplier: transaction.supplier ?? '',
      quantities,
    }
  })

const removeSheetRow = (localId) => {
  sheetRows.value = sheetRows.value.filter((row) => row.localId !== localId)
}

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const formatQuantity = (value) => {
  const number = toNumber(value)
  if (!number) return ''
  return number.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

const formatShortDate = (value) => {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value || ''
  return `${match[1].slice(2)}.${match[2]}.${match[3]}`
}

const inferTransactionTypeFromQuantityMap = (quantities) => {
  const values = Object.values(quantities ?? {}).map(toNumber).filter((quantity) => quantity !== 0)
  if (values.some((quantity) => quantity < 0) && values.some((quantity) => quantity > 0)) return 'adjustment'
  if (values.some((quantity) => quantity < 0)) return 'return'
  return 'incoming'
}

const quantityClass = (value) => {
  const number = toNumber(value)
  if (number < 0) return 'text-red-600'
  if (number > 0) return 'text-slate-950'
  return 'text-slate-300'
}

const editKey = (row, field, materialId = '') => `${row.localId}:${field}:${materialId}`

const isEditing = (row, field, materialId = '') => editingCell.value === editKey(row, field, materialId)

const startCellEdit = (row, field, materialId = '') => {
  if (!row.saved || savingCell.value) return
  editingCell.value = editKey(row, field, materialId)
  if (field === 'quantity') {
    editingValue.value = row.quantities[String(materialId)] ?? ''
  } else {
    editingValue.value = row[field] ?? ''
  }
  void nextTick(() => {
    const selector = `[data-edit-key="${CSS.escape(editingCell.value)}"]`
    document.querySelector(selector)?.focus()
  })
}

const cancelCellEdit = () => {
  editingCell.value = null
  editingValue.value = ''
}

const applyCompanyStockQuantityChange = (materialId, previousQuantity, nextQuantity) => {
  if (previousQuantity === nextQuantity) return
  companyStockTotals.value = companyStockTotals.value.map((row) => {
    if (String(row.id) !== String(materialId)) return row
    const previousIncoming = Math.max(0, previousQuantity)
    const nextIncoming = Math.max(0, nextQuantity)
    const previousOutgoing = Math.min(0, previousQuantity)
    const nextOutgoing = Math.min(0, nextQuantity)
    const incomingQuantity = toNumber(row.incomingQuantity) + nextIncoming - previousIncoming
    const outgoingQuantity = toNumber(row.outgoingQuantity) + nextOutgoing - previousOutgoing
    return {
      ...row,
      incomingQuantity,
      outgoingQuantity,
      quantity: incomingQuantity + outgoingQuantity,
    }
  })
}

const commitCellEdit = async (row, field, materialId = '') => {
  if (!row.saved || !isEditing(row, field, materialId)) return
  const nextValue = String(editingValue.value ?? '').trim()
  const key = editKey(row, field, materialId)
  const currentValue =
    field === 'quantity'
      ? String(row.quantities[String(materialId)] ?? '').trim()
      : String(row[field] ?? '').trim()

  if (currentValue === nextValue) {
    cancelCellEdit()
    return
  }

  savingCell.value = key

  try {
    if (field === 'quantity') {
      const quantityKey = String(materialId)
      const previousQuantity = toNumber(row.quantities[quantityKey])
      const quantity = toNumber(nextValue)
      const nextQuantities = {
        ...row.quantities,
        [quantityKey]: quantity ? String(quantity) : '',
      }
      const transactionType = inferTransactionTypeFromQuantityMap(nextQuantities)
      await updateInventoryTransactionItemQuantity(row.transactionId, materialId, quantity, transactionType)
      row.quantities = nextQuantities
      if (transactionType) row.transactionType = transactionType
      applyCompanyStockQuantityChange(materialId, previousQuantity, quantity)
    } else {
      const dbFieldMap = {
        transactionDate: 'transaction_date',
        memo: 'memo',
        manufacturer: 'manufacturer',
        supplier: 'supplier',
      }
      await updateInventoryTransactionHeader(row.transactionId, dbFieldMap[field], nextValue)
      row[field] = nextValue
    }
    cancelCellEdit()
  } catch (error) {
    await handleSaveError(error, '입출고 내역 수정에 실패했습니다.')
  } finally {
    savingCell.value = ''
  }
}

const loadMainOverview = async () => {
  stockLoading.value = true
  try {
    totalStockRows.value = await fetchInventoryStockSummary(materialItems.value)
  } finally {
    stockLoading.value = false
  }
}

const loadCompanyLedger = async (company, resetRows = true) => {
  selectedCompany.value = company
  ledgerLoading.value = true
  stockLoading.value = true
  savedMessage.value = ''
  try {
    const [stockTotals, savedTransactions] = await Promise.all([
      fetchInventoryStockTotals(materialItems.value, company.id),
      fetchRecentInventoryTransactions(300, company.id),
    ])
    companyStockTotals.value = stockTotals
    if (resetRows) sheetRows.value = createSavedSheetRows(savedTransactions)
  } finally {
    ledgerLoading.value = false
    stockLoading.value = false
  }
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  savedMessage.value = ''
  try {
    const entryData = await fetchInventoryEntryData()
    companies.value = entryData.companies
    materialItems.value = entryData.materialItems
    setupWarning.value = entryData.setupWarning
    syncRowQuantityKeys()
    if (selectedCompany.value) {
      await loadCompanyLedger(selectedCompany.value, false)
    } else {
      await loadMainOverview()
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '입출고 데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

const openRegisterDialog = () => {
  savedMessage.value = ''
  registerDialogOpen.value = true
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
  companyStockTotals.value = []
  resetSheetRows()
  savedMessage.value = ''
  errorMessage.value = ''
  await loadMainOverview()
}

const saveRows = async () => {
  if (!selectedCompany.value) {
    await alert('현장을 먼저 선택해주세요.')
    return
  }

  saving.value = true
  errorMessage.value = ''
  savedMessage.value = ''
  try {
    const targetRows = sheetRows.value.filter((row) => !row.saved)
    const savedIds = await saveInventorySheetRows(targetRows, materialItems.value, selectedCompany.value)
    await loadCompanyLedger(selectedCompany.value, true)
    savedMessage.value = `${savedIds.length}건 저장했습니다.`
  } catch (error) {
    await handleSaveError(error, '입출고 저장에 실패했습니다.')
  } finally {
    saving.value = false
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
  savedMessage.value = ''
  try {
    const result = await parseInventoryExcelFile(file, materialItems.value)
    if (result.rows.length === 0) {
      await alert('엑셀에서 가져올 입출고 내역이 없습니다.')
      return
    }
    addRowsToSheet(result.rows)
    const warningText = result.warnings.length > 0 ? ` 제외된 항목: ${result.warnings.join(' / ')}` : ''
    savedMessage.value = `${file.name}에서 ${result.rows.length}건을 입력표에 넣었습니다.${warningText}`
  } catch (error) {
    await alert(error instanceof Error ? error.message : '엑셀 파일을 읽지 못했습니다.')
  } finally {
    excelParsing.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <main
    class="bg-slate-50 px-4 md:px-6"
    :class="selectedCompany ? 'min-h-screen pt-3 pb-[10px]' : 'min-h-screen py-5'"
  >
    <section class="mx-auto max-w-[1600px]">
      <div
        class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        :class="selectedCompany ? 'mb-2' : 'mb-4'"
      >
        <div class="min-w-0">
          <h1 class="mt-1 truncate text-2xl font-extrabold text-slate-900">
            {{ inventoryPageTitle }}
          </h1>
        </div>

        <div v-if="selectedCompany" class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            @click="goBackToOverview"
          >
            <ArrowLeft class="h-4 w-4" />
            메인
          </button>
        </div>

        <div v-else class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            @click="quickLookupOpen = true"
          >
            <Search class="h-4 w-4" />
            간편조회
          </button>
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

      <div v-if="setupWarning" class="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
        {{ setupWarning }}
      </div>
      <div v-if="errorMessage" class="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
        {{ errorMessage }}
      </div>
      <div v-if="savedMessage" class="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
        {{ savedMessage }}
      </div>

      <InventoryStockSummary
        v-if="!selectedCompany"
        title="현재 총재고"
        description="전체 현장의 입출고 수량을 합산한 재고입니다."
        :rows="totalStockRows"
        :loading="loading || stockLoading"
      />

      <template v-else>
        <InventoryStockTotalsTable
          title="현장 현재 재고"
          :rows="companyStockTotals"
          :loading="loading || stockLoading"
        />

        <section class="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
            <h2 class="text-sm font-extrabold text-slate-900">입출고 내역</h2>
            <div class="flex flex-wrap items-center justify-end gap-2">
              <input
                ref="excelFileInput"
                type="file"
                class="hidden"
                accept=".xls,.xlsx"
                @change="handleExcelFileChange"
              />
              <button
                type="button"
                class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                @click="addSheetRow"
              >
                <Plus class="h-3.5 w-3.5" />
                행추가
              </button>
              <button
                type="button"
                class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                :disabled="excelParsing || Boolean(setupWarning)"
                @click="openExcelFilePicker"
              >
                <Loader2 v-if="excelParsing" class="h-3.5 w-3.5 animate-spin" />
                <Upload v-else class="h-3.5 w-3.5" />
                엑셀 업로드
              </button>
              <button
                type="button"
                class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                :disabled="saving || Boolean(setupWarning) || !hasUnsavedRows"
                @click="saveRows"
              >
                <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
                <Save v-else class="h-3.5 w-3.5" />
                저장
              </button>
            </div>
          </div>

          <div ref="sheetScroll" class="inventory-sheet-scroll">
            <table class="inventory-sheet" :style="{ minWidth: `${sheetMinWidth}px` }">
              <colgroup>
                <col class="col-no" />
                <col class="col-date" />
                <col class="col-memo" />
                <col class="col-maker" />
                <col class="col-supplier" />
                <template v-for="group in groupedMaterialItems" :key="`col-${group.name}`">
                  <col v-for="item in group.items" :key="item.id" class="col-material" />
                </template>
                <col class="col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th class="sticky-col sticky-no" rowspan="2">No</th>
                  <th class="sticky-col sticky-date" rowspan="2">일자</th>
                  <th class="sticky-col sticky-memo" rowspan="2">내역</th>
                  <th class="sticky-col sticky-maker" rowspan="2">제조사</th>
                  <th class="sticky-col sticky-supplier" rowspan="2">입고처/출고처</th>
                  <th
                    v-for="(group, groupIndex) in groupedMaterialItems"
                    :key="group.name"
                    :colspan="group.items.length"
                    class="material-group-cell group-boundary-start"
                    :style="groupHeaderStyle(groupIndex)"
                  >
                    {{ group.name }}
                  </th>
                  <th class="w-12" rowspan="2"></th>
                </tr>
                <tr>
                  <template v-for="(group, groupIndex) in groupedMaterialItems" :key="`${group.name}-items`">
                    <th
                      v-for="(item, itemIndex) in group.items"
                      :key="item.id"
                      class="material-item-cell"
                      :class="{ 'group-boundary-start': isFirstGroupItem(itemIndex) }"
                      :style="[groupSubHeaderStyle(groupIndex), isFirstGroupItem(itemIndex) ? groupBoundaryStyle(groupIndex) : null]"
                    >
                      {{ item.spec }}
                    </th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <tr v-if="ledgerLoading">
                  <td :colspan="6 + materialItems.length" class="h-24 text-center text-sm font-bold text-slate-500">
                    불러오는 중입니다.
                  </td>
                </tr>
                <tr v-else-if="sheetRows.length === 0">
                  <td :colspan="6 + materialItems.length" class="h-24 text-center text-sm font-bold text-slate-400">
                    행추가 버튼으로 입력 행을 추가하세요.
                  </td>
                </tr>
                <tr v-for="(row, index) in sheetRows" v-else :key="row.localId">
                  <td class="sticky-col sticky-no text-center text-xs font-bold text-slate-500">{{ index + 1 }}</td>
                  <td class="sticky-col sticky-date">
                    <input
                      v-if="!row.saved || isEditing(row, 'transactionDate')"
                      :value="row.saved ? editingValue : row.transactionDate"
                      :data-edit-key="editKey(row, 'transactionDate')"
                      type="date"
                      class="sheet-input"
                      @focus="row.saved && (editingValue = row.transactionDate)"
                      @input="row.saved ? (editingValue = $event.target.value) : (row.transactionDate = $event.target.value)"
                      @keydown.enter.prevent="commitCellEdit(row, 'transactionDate')"
                      @keydown.esc.prevent="cancelCellEdit"
                      @blur="row.saved && commitCellEdit(row, 'transactionDate')"
                    />
                    <button v-else type="button" class="saved-cell" @click="startCellEdit(row, 'transactionDate')">
                      {{ formatShortDate(row.transactionDate) }}
                    </button>
                  </td>
                  <td class="sticky-col sticky-memo">
                    <div v-if="!row.saved || isEditing(row, 'memo')" class="memo-editor">
                      <input
                        :value="row.saved ? editingValue : row.memo"
                        :data-edit-key="editKey(row, 'memo')"
                        type="text"
                        class="sheet-input memo-text-input"
                        @focus="row.saved && (editingValue = row.memo)"
                        @input="row.saved ? (editingValue = $event.target.value) : (row.memo = $event.target.value)"
                        @keydown.enter.prevent="commitCellEdit(row, 'memo')"
                        @keydown.esc.prevent="cancelCellEdit"
                        @blur="row.saved && commitCellEdit(row, 'memo')"
                      />
                    </div>
                    <button v-else type="button" class="saved-cell" @click="startCellEdit(row, 'memo')">
                      {{ row.memo || '' }}
                    </button>
                  </td>
                  <td class="sticky-col sticky-maker">
                    <input
                      v-if="!row.saved || isEditing(row, 'manufacturer')"
                      :value="row.saved ? editingValue : row.manufacturer"
                      :data-edit-key="editKey(row, 'manufacturer')"
                      type="text"
                      class="sheet-input"
                      @focus="row.saved && (editingValue = row.manufacturer)"
                      @input="row.saved ? (editingValue = $event.target.value) : (row.manufacturer = $event.target.value)"
                      @keydown.enter.prevent="commitCellEdit(row, 'manufacturer')"
                      @keydown.esc.prevent="cancelCellEdit"
                      @blur="row.saved && commitCellEdit(row, 'manufacturer')"
                    />
                    <button v-else type="button" class="saved-cell" @click="startCellEdit(row, 'manufacturer')">
                      {{ row.manufacturer || '' }}
                    </button>
                  </td>
                  <td class="sticky-col sticky-supplier">
                    <input
                      v-if="!row.saved || isEditing(row, 'supplier')"
                      :value="row.saved ? editingValue : row.supplier"
                      :data-edit-key="editKey(row, 'supplier')"
                      type="text"
                      class="sheet-input"
                      @focus="row.saved && (editingValue = row.supplier)"
                      @input="row.saved ? (editingValue = $event.target.value) : (row.supplier = $event.target.value)"
                      @keydown.enter.prevent="commitCellEdit(row, 'supplier')"
                      @keydown.esc.prevent="cancelCellEdit"
                      @blur="row.saved && commitCellEdit(row, 'supplier')"
                    />
                    <button v-else type="button" class="saved-cell" @click="startCellEdit(row, 'supplier')">
                      {{ row.supplier || '' }}
                    </button>
                  </td>
                  <template v-for="(group, groupIndex) in groupedMaterialItems" :key="`${row.localId}-${group.name}`">
                    <td
                      v-for="(item, itemIndex) in group.items"
                      :key="item.id"
                      :class="{ 'group-boundary-start': isFirstGroupItem(itemIndex) }"
                      :style="[groupBodyCellStyle(groupIndex), isFirstGroupItem(itemIndex) ? groupBoundaryStyle(groupIndex) : null]"
                    >
                      <input
                        v-if="!row.saved || isEditing(row, 'quantity', item.id)"
                        :value="row.saved ? editingValue : row.quantities[String(item.id)]"
                        :data-edit-key="editKey(row, 'quantity', item.id)"
                        type="number"
                        step="0.01"
                        inputmode="decimal"
                        class="sheet-input"
                        :class="quantityClass(row.saved ? editingValue : row.quantities[String(item.id)])"
                        @focus="row.saved && (editingValue = row.quantities[String(item.id)] ?? '')"
                        @input="row.saved ? (editingValue = $event.target.value) : (row.quantities[String(item.id)] = $event.target.value)"
                        @keydown.enter.prevent="commitCellEdit(row, 'quantity', item.id)"
                        @keydown.esc.prevent="cancelCellEdit"
                        @blur="row.saved && commitCellEdit(row, 'quantity', item.id)"
                      />
                      <button
                        v-else
                        type="button"
                        class="saved-cell"
                        :class="quantityClass(row.quantities[String(item.id)])"
                        @click="startCellEdit(row, 'quantity', item.id)"
                      >
                        {{ formatQuantity(row.quantities[String(item.id)]) }}
                      </button>
                    </td>
                  </template>
                  <td class="text-center">
                    <button
                      v-if="!row.saved"
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      @click="removeSheetRow(row.localId)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </section>

    <InventoryCompanySearchDialog
      v-if="registerDialogOpen"
      :companies="companies"
      title="입출고 등록 현장 선택"
      description="먼저 현장을 선택한 뒤 해당 현장의 입출고 장부에서 입력합니다."
      @close="registerDialogOpen = false"
      @select="selectCompanyForEntry"
    />

    <InventoryQuickLookupDialog
      v-if="quickLookupOpen"
      :companies="companies"
      :material-items="materialItems"
      @close="quickLookupOpen = false"
    />
  </main>
</template>

<style scoped>
.inventory-sheet-scroll {
  position: relative;
  height: calc(100vh - 150px);
  min-height: 360px;
  overflow-x: auto;
  overflow-y: auto;
  overscroll-behavior-x: contain;
}

.inventory-sheet {
  width: max-content;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.inventory-sheet th,
.inventory-sheet td {
  border-right: 1px solid rgb(226 232 240);
  border-bottom: 1px solid rgb(226 232 240);
  border-left: 0 solid transparent;
  padding: 4px 6px;
  text-align: center;
  vertical-align: middle;
}

.inventory-sheet tbody td {
  height: 50px;
}

.inventory-sheet th {
  position: sticky;
  top: 0;
  z-index: 4;
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  font-size: 12px;
  font-weight: 900;
  height: 32px;
  text-align: center;
}

.inventory-sheet thead tr:nth-child(2) th {
  top: 32px;
}

.inventory-sheet td {
  background: white;
}

.col-no {
  width: 44px;
}

.col-date {
  width: 84px;
}

.col-memo {
  width: 220px;
}

.col-maker {
  width: 96px;
}

.col-supplier {
  width: 118px;
}

.col-material {
  width: 70px;
}

.col-action {
  width: 48px;
}

.inventory-sheet .sticky-col {
  position: sticky;
  z-index: 3;
}

.inventory-sheet thead .sticky-col {
  z-index: 8;
  background: rgb(248 250 252);
}

.inventory-sheet tbody .sticky-col {
  background: white;
}

.sticky-no {
  left: 0;
  width: 44px;
  min-width: 44px;
}

.sticky-date {
  left: 44px;
  width: 84px;
  min-width: 84px;
}

.sticky-memo {
  left: 128px;
  width: 220px;
  min-width: 220px;
}

.sticky-maker {
  left: 348px;
  width: 96px;
  min-width: 96px;
}

.sticky-supplier {
  left: 444px;
  width: 118px;
  min-width: 118px;
  box-shadow: 1px 0 0 rgb(226 232 240);
}

.material-group-cell {
  font-weight: 950;
}

.group-boundary-start {
  border-left-width: 1px !important;
  border-left-style: solid !important;
}

.material-item-cell,
.inventory-sheet tbody td:not(.sticky-col) {
  width: 70px;
  min-width: 70px;
  max-width: 70px;
}

.sheet-input {
  height: 40px;
  width: 100%;
  min-width: 0;
  border-radius: 8px;
  border: 1px solid rgb(203 213 225);
  background: white;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: rgb(15 23 42);
  text-align: center;
  outline: none;
}

.sheet-input.text-red-600,
.saved-cell.text-red-600 {
  color: rgb(220 38 38);
}

.sheet-input.text-slate-400,
.saved-cell.text-slate-400 {
  color: rgb(148 163 184);
}

.sheet-input:focus {
  border-color: rgb(37 99 235);
  box-shadow: 0 0 0 2px rgb(191 219 254);
}

.sheet-input[type='number'] {
  -moz-appearance: textfield;
}

.sheet-input[type='number']::-webkit-outer-spin-button,
.sheet-input[type='number']::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.memo-editor {
  width: 100%;
}

.memo-text-input {
  padding-inline: 4px;
}

.saved-cell {
  display: -webkit-box;
  min-height: 40px;
  height: 40px;
  width: 100%;
  min-width: 0;
  border-radius: 6px;
  padding: 0 4px;
  font-size: 13px;
  font-weight: 800;
  line-height: 18px;
  color: rgb(15 23 42);
  text-align: center;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.saved-cell:hover {
  background: rgb(239 246 255);
}

</style>
