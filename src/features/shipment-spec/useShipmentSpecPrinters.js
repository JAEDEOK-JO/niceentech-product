import { ref } from 'vue'

export const useShipmentSpecPrinters = () => {
  const printers = ref([])
  const selectedPrinterName = ref('')
  const printerLoading = ref(false)
  const printerError = ref('')

  const loadPrinters = async () => {
    if (!window.electronAPI?.getPrinters) {
      printers.value = []
      selectedPrinterName.value = ''
      printerError.value = ''
      return
    }

    printerLoading.value = true
    printerError.value = ''
    try {
      const list = await window.electronAPI.getPrinters()
      printers.value = Array.isArray(list) ? list : []
      const exists = printers.value.some((printer) => printer.name === selectedPrinterName.value)
      if (!exists) selectedPrinterName.value = ''
    } catch {
      printers.value = []
      selectedPrinterName.value = ''
      printerError.value = '프린터 목록을 불러오지 못했습니다.'
    } finally {
      printerLoading.value = false
    }
  }

  const resetPrinters = () => {
    selectedPrinterName.value = ''
    printerError.value = ''
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
