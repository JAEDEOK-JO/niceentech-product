import { ref } from 'vue'

export const useShipmentSpecPrinters = () => {
  const printers = ref([])
  const selectedPrinterName = ref('')
  const printerLoading = ref(false)
  const printerError = ref(false)

  const loadPrinters = async () => {
    if (!window.electronAPI?.getPrinters) {
      printers.value = []
      selectedPrinterName.value = ''
      printerError.value = false
      return
    }

    printerLoading.value = true
    printerError.value = false
    try {
      const list = await window.electronAPI.getPrinters()
      printers.value = Array.isArray(list) ? list : []
      const exists = printers.value.some((printer) => printer.name === selectedPrinterName.value)
      if (!exists) selectedPrinterName.value = ''
    } catch {
      printers.value = []
      selectedPrinterName.value = ''
      printerError.value = true
    } finally {
      printerLoading.value = false
    }
  }

  const resetPrinters = () => {
    selectedPrinterName.value = ''
    printerError.value = false
  }

  return {
    printers,
    selectedPrinterName,
    printerLoading,
    printerError,
    loadPrinters,
    resetPrinters,
  }
}
