<script setup>
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '@/components/ui/button/Button.vue'
import { useAuth } from '@/composables/useAuth'
import { filterShipmentSpecRows } from '@/features/shipment-spec/filterShipmentSpecRows'
import ShipmentSpecPrintDialog from '@/features/shipment-spec/ShipmentSpecPrintDialog.vue'
import ShipmentSpecPrintStack from '@/features/shipment-spec/ShipmentSpecPrintStack.vue'
import ShipmentSpecSearchInput from '@/features/shipment-spec/ShipmentSpecSearchInput.vue'
import ShipmentSpecTable from '@/features/shipment-spec/ShipmentSpecTable.vue'
import { printShipmentSpec } from '@/features/shipment-spec/printShipmentSpec'
import { buildShipmentSpecPrintSheets } from '@/features/shipment-spec/shipmentSpecFormFields'
import { saveShipmentSpecOutput } from '@/features/shipment-spec/shipmentSpecOutput'
import { useShipmentSpecDialogLocale } from '@/features/shipment-spec/useShipmentSpecDialogLocale'
import { useShipmentSpecList } from '@/features/shipment-spec/useShipmentSpecList'
import { useShipmentSpecPrintDialog } from '@/features/shipment-spec/useShipmentSpecPrintDialog'

const router = useRouter()
const { session } = useAuth()
const {
  rows,
  loading,
  errorMessage,
  weekOffset,
  pageTitle,
  moveWeek,
  resetWeek,
  loadRows,
} = useShipmentSpecList(session)

const searchText = ref('')
const filteredRows = computed(() => filterShipmentSpecRows(rows.value, searchText.value))

const {
  open,
  selectedRow,
  orientation,
  printedHistory,
  remarkFields,
  openDialog,
  closeDialog,
  addRemarkField,
  removeRemarkField,
  historyRemarksAfterRemove,
  applyHistoryRemove,
  remarksForPrint,
  remarksForSave,
  absorbPrintedRemarks,
} = useShipmentSpecPrintDialog()
const { copy } = useShipmentSpecDialogLocale()

const isPrinting = ref(false)
const printSheets = ref([])
const printLandscape = ref(false)

const goHome = () => {
  router.push({ name: 'main' })
}

const handleClose = () => {
  if (isPrinting.value) return
  closeDialog()
}

const runPrint = async (row, remarks, landscape, deviceName = '') => {
  printLandscape.value = Boolean(landscape)
  printSheets.value = buildShipmentSpecPrintSheets(row, remarks)
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 200))
  try {
    await printShipmentSpec(isPrinting, {
      landscape: printLandscape.value,
      deviceName,
    })
  } finally {
    printSheets.value = []
  }
}

const handleRemoveHistory = async (index) => {
  if (isPrinting.value) return
  const remarks = historyRemarksAfterRemove(index)
  const landscape = orientation.value === 'landscape'
  try {
    await saveShipmentSpecOutput(selectedRow.value.id, remarks, landscape)
  } catch (error) {
    window.alert(error?.message ?? copy.value.saveFailed)
    return
  }
  applyHistoryRemove(index)
  await loadRows()
}

const handleDialogPrint = async (options = {}) => {
  const remarks = remarksForSave()
  const toPrint = options.scope === 'all' ? remarks : remarksForPrint()
  const landscape = orientation.value === 'landscape'
  try {
    await saveShipmentSpecOutput(selectedRow.value.id, remarks, landscape)
    absorbPrintedRemarks()
    await loadRows()
  } catch (error) {
    window.alert(error?.message ?? copy.value.saveFailed)
    return
  }
  if (toPrint.length === 0) return
  await runPrint(selectedRow.value, toPrint, landscape, options.deviceName)
}
</script>

<template>
  <section class="shipment-spec-page flex h-[calc(100dvh-56px)] flex-col overflow-hidden bg-slate-100 md:h-[calc(100vh-72px)]">
    <header class="shipment-spec-chrome shrink-0 border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 md:px-6">
        <h1 class="mr-1 shrink-0 text-base font-extrabold text-slate-900">{{ pageTitle }}</h1>
        <Button class="h-8 px-2.5 text-xs" variant="outline" @click="moveWeek(-1)">지난주</Button>
        <Button class="h-8 px-2.5 text-xs" variant="outline" :disabled="weekOffset === 0" @click="resetWeek">이번주</Button>
        <Button class="h-8 px-2.5 text-xs" variant="outline" @click="moveWeek(1)">다음주</Button>
        <div class="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          <ShipmentSpecSearchInput v-model="searchText" class="max-w-2xl flex-1" />
          <Button class="h-8 shrink-0 px-2.5 text-xs" variant="outline" @click="goHome">홈</Button>
        </div>
      </div>
    </header>

    <main class="shipment-spec-chrome min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-7xl px-4 py-4 md:px-6">
        <ShipmentSpecTable
          :rows="filteredRows"
          :loading="loading"
          :error-message="errorMessage"
          @select="openDialog"
        />
      </div>
    </main>

    <ShipmentSpecPrintDialog
      :open="open"
      :row="selectedRow"
      :orientation="orientation"
      :printed-history="printedHistory"
      :remark-fields="remarkFields"
      :printing="isPrinting"
      @close="handleClose"
      @print="handleDialogPrint"
      @add="addRemarkField"
      @remove="removeRemarkField"
      @remove-history="handleRemoveHistory"
      @update:orientation="orientation = $event"
    />

    <ShipmentSpecPrintStack
      :sheets="printSheets"
      :landscape="printLandscape"
    />
  </section>
</template>

<style src="@/features/shipment-spec/shipmentSpecPrint.css"></style>
