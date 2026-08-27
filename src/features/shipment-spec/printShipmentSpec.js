import { nextTick } from 'vue'
import { resolveElectronMargins } from '@/features/printing/pagePrint'
import { buildShipmentSpecPrintHtml } from './shipmentSpecPrintHtml'

const STYLE_ID = 'shipment-spec-print-page'

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

const applyShipmentSpecPageStyle = (landscape) => {
  if (typeof document === 'undefined') return
  let style = document.getElementById(STYLE_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = `
@media print {
  @page {
    size: A4 ${landscape ? 'landscape' : 'portrait'};
    margin: 0;
  }
}`
}

const clearShipmentSpecPageStyle = () => {
  if (typeof document === 'undefined') return
  document.getElementById(STYLE_ID)?.remove()
}

const printInBrowser = async (landscape) => {
  applyShipmentSpecPageStyle(landscape)
  await nextTick()
  window.print()
  clearShipmentSpecPageStyle()
}

export const printShipmentSpec = async (isPrinting, { landscape = false, deviceName = '' } = {}) => {
  if (typeof window === 'undefined') return

  const root = document.querySelector('.shipment-spec-print-root')
  if (!root) {
    window.alert('인쇄할 양식이 없습니다.')
    return
  }

  isPrinting.value = true
  try {
    if (!window.electronAPI?.printHtmlDocument) {
      await printInBrowser(landscape)
      return
    }

    const html = await buildShipmentSpecPrintHtml(root, landscape)
    const printerName = String(deviceName || '').trim() || await getDefaultPrinterName()
    const result = await window.electronAPI.printHtmlDocument({
      html,
      landscape,
      pageSize: 'A4',
      silent: true,
      scaleFactor: 100,
      margins: resolveElectronMargins('0mm'),
      ...(printerName ? { deviceName: printerName } : {}),
    })

    if (result?.success || isCanceledPrint(result)) return
    window.alert(`인쇄에 실패했습니다.\n사유: ${result?.errorType || '알 수 없음'}`)
  } finally {
    isPrinting.value = false
  }
}
