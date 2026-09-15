import { ref } from 'vue'
import { mergeShipmentSpecRemarks, remarksForBadges } from './shipmentSpecOutput'

let remarkSeq = 1

const createRemarkField = (text = '') => ({
  id: remarkSeq++,
  text,
})

const fieldsToRemarks = (fields) => remarksForBadges(fields.map((field) => field.text))

export const useShipmentSpecPrintDialog = () => {
  const open = ref(false)
  const selectedRow = ref(null)
  const orientation = ref('portrait')
  const printedHistory = ref([])
  const remarkFields = ref([createRemarkField()])

  const syncSelectedRemarks = (remarks) => {
    if (!selectedRow.value) return
    selectedRow.value = {
      ...selectedRow.value,
      shipment_spec_remarks: remarks,
    }
  }

  const openDialog = (row) => {
    selectedRow.value = row
    orientation.value = row?.shipment_spec_landscape ? 'landscape' : 'portrait'
    printedHistory.value = remarksForBadges(row?.shipment_spec_remarks).map((text) => createRemarkField(text))
    remarkFields.value = [createRemarkField()]
    open.value = true
  }

  const closeDialog = () => {
    open.value = false
    selectedRow.value = null
    printedHistory.value = []
    remarkFields.value = [createRemarkField()]
    orientation.value = 'portrait'
  }

  const addRemarkField = () => {
    remarkFields.value = [...remarkFields.value, createRemarkField()]
  }

  const removeRemarkField = (index) => {
    if (remarkFields.value.length <= 1) return
    remarkFields.value = remarkFields.value.filter((_, fieldIndex) => fieldIndex !== index)
  }

  const historyRemarksAfterRemove = (index) => (
    fieldsToRemarks(printedHistory.value.filter((_, fieldIndex) => fieldIndex !== index))
  )

  const applyHistoryRemove = (index) => {
    printedHistory.value = printedHistory.value.filter((_, fieldIndex) => fieldIndex !== index)
    syncSelectedRemarks(fieldsToRemarks(printedHistory.value))
  }

  const remarksForPrint = () => fieldsToRemarks(remarkFields.value)

  const remarksForSave = () => mergeShipmentSpecRemarks(
    fieldsToRemarks(printedHistory.value),
    fieldsToRemarks(remarkFields.value),
  )

  const absorbPrintedRemarks = () => {
    const saved = remarksForSave()
    printedHistory.value = saved.map((text) => createRemarkField(text))
    remarkFields.value = [createRemarkField()]
    syncSelectedRemarks(saved)
  }

  return {
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
  }
}
