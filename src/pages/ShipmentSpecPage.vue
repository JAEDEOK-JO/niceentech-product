<script setup>
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '@/components/ui/button/Button.vue'
import { useAuth } from '@/composables/useAuth'
import ShipmentSpecPrintDialog from '@/features/shipment-spec/ShipmentSpecPrintDialog.vue'
import ShipmentSpecPrintStack from '@/features/shipment-spec/ShipmentSpecPrintStack.vue'
import ShipmentSpecTable from '@/features/shipment-spec/ShipmentSpecTable.vue'
import { printShipmentSpec } from '@/features/shipment-spec/printShipmentSpec'
import { buildShipmentSpecPrintSheets } from '@/features/shipment-spec/shipmentSpecFormFields'
import { saveShipmentSpecOutput } from '@/features/shipment-spec/shipmentSpecOutput'
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

const {
  open,
  selectedRow,
  orientation,
  remarkFields,
  openDialog,
  closeDialog,
  addRemarkField,
  removeRemarkField,
  remarksForPrint,
} = useShipmentSpecPrintDialog()

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

const runPrint = async (row, remarks, landscape) => {
  printLandscape.value = Boolean(landscape)
  printSheets.value = buildShipmentSpecPrintSheets(row, remarks)
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 200))
  try {
    await printShipmentSpec(isPrinting, { landscape: printLandscape.value })
  } finally {
    printSheets.value = []
  }
}

const handleDialogPrint = async () => {
  const remarks = remarksForPrint()
  const landscape = orientation.value === 'landscape'
  try {
    await saveShipmentSpecOutput(selectedRow.value.id, remarks, landscape)
    await loadRows()
  } catch (error) {
    window.alert(error?.message ?? '저장 실패')
    return
  }
  await runPrint(selectedRow.value, remarks, landscape)
}
</script>

<template>
  <section class="shipment-spec-page min-h-[calc(100dvh-56px)] bg-slate-100 md:min-h-[calc(100vh-72px)]">
    <header class="shipment-spec-chrome border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 md:px-6">
        <h1 class="mr-1 text-base font-extrabold text-slate-900">{{ pageTitle }}</h1>
        <Button class="h-8 px-2.5 text-xs" variant="outline" @click="moveWeek(-1)">지난주</Button>
        <Button class="h-8 px-2.5 text-xs" variant="outline" :disabled="weekOffset === 0" @click="resetWeek">이번주</Button>
        <Button class="h-8 px-2.5 text-xs" variant="outline" @click="moveWeek(1)">다음주</Button>
        <Button class="ml-auto h-8 px-2.5 text-xs" variant="outline" @click="goHome">홈</Button>
      </div>
    </header>

    <main class="shipment-spec-chrome mx-auto max-w-7xl px-4 py-4 md:px-6">
      <ShipmentSpecTable
        :rows="rows"
        :loading="loading"
        :error-message="errorMessage"
        @select="openDialog"
      />
    </main>

    <ShipmentSpecPrintDialog
      :open="open"
      :orientation="orientation"
      :remark-fields="remarkFields"
      :printing="isPrinting"
      @close="handleClose"
      @print="handleDialogPrint"
      @add="addRemarkField"
      @remove="removeRemarkField"
      @update:orientation="orientation = $event"
    />

    <ShipmentSpecPrintStack
      :sheets="printSheets"
      :landscape="printLandscape"
    />
  </section>
</template>

<style src="@/features/shipment-spec/shipmentSpecPrint.css"></style>
