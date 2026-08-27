import { ref } from 'vue'
import { parseShipmentSpecRemarks } from './shipmentSpecOutput'

let remarkSeq = 1

const createRemarkField = (text = '') => ({
  id: remarkSeq++,
  text,
})

export const useShipmentSpecPrintDialog = () => {
  const open = ref(false)
  const selectedRow = ref(null)
  const orientation = ref('portrait')
  const remarkFields = ref([createRemarkField()])

  const openDialog = (row) => {
    selectedRow.value = row
    orientation.value = row?.shipment_spec_landscape ? 'landscape' : 'portrait'
    const savedRemarks = parseShipmentSpecRemarks(row?.shipment_spec_remarks)
    remarkFields.value = savedRemarks.length
      ? savedRemarks.map((text) => createRemarkField(text))
      : [createRemarkField()]
    open.value = true
  }

  const closeDialog = () => {
    open.value = false
    selectedRow.value = null
    remarkFields.value = [createRemarkField()]
    orientation.value = 'portrait'
  }

  const addRemarkField = (index) => {
    const next = [...remarkFields.value]
    next.splice(index + 1, 0, createRemarkField())
    remarkFields.value = next
  }

  const removeRemarkField = (index) => {
    if (remarkFields.value.length <= 1) return
    remarkFields.value = remarkFields.value.filter((_, fieldIndex) => fieldIndex !== index)
  }

  const remarksForPrint = () => remarkFields.value.map((field) => field.text)

  return {
    open,
    selectedRow,
    orientation,
    remarkFields,
    openDialog,
    closeDialog,
    addRemarkField,
    removeRemarkField,
    remarksForPrint,
  }
}
