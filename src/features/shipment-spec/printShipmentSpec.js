import { resolveElectronMargins } from '@/features/printing/pagePrint'
import { buildShipmentSpecPrintHtml } from './shipmentSpecPrintHtml'

const isCanceledPrint = (result) => (
  result?.errorType === 'Print job canceled' ||
  result?.errorType === 'cancelled' ||
  result?.errorType === 'canceled'
)

const getDefaultPrinterName = async () => {
  if (!window.electronAPI?.getPrinters) return ''
  try {
    const printers = await window.electronAPI.getPrinters()
    if (!Array.isArray(printers) || printers.length === 0) return ''
    return String(printers.find((printer) => printer.isDefault)?.name || printers[0]?.name || '')
  } catch {
    return ''
  }
}

export const printShipmentSpec = async (isPrinting, { landscape = false } = {}) => {
  if (typeof window === 'undefined') return

  const root = document.querySelector('.shipment-spec-print-root')
  if (!root) {
    window.alert('인쇄할 양식이 없습니다.')
    return
  }

  isPrinting.value = true
  try {
    if (!window.electronAPI?.printHtmlDocument) {
      window.alert('인쇄는 앱에서만 됩니다.')
      return
    }

    const html = await buildShipmentSpecPrintHtml(root, landscape)
    const deviceName = await getDefaultPrinterName()
    const result = await window.electronAPI.printHtmlDocument({
      html,
      landscape,
      pageSize: 'A4',
      silent: true,
      scaleFactor: 100,
      margins: resolveElectronMargins('0mm'),
      ...(deviceName ? { deviceName } : {}),
    })

    if (result?.success || isCanceledPrint(result)) return
    window.alert(`인쇄에 실패했습니다.\n사유: ${result?.errorType || '알 수 없음'}`)
  } finally {
    isPrinting.value = false
  }
}
