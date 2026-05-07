import { nextTick } from 'vue'

export const DEFAULT_PRINT_OPTIONS = {
  printBackground: true,
  landscape: true,
  pageSize: 'A4',
  scaleFactor: 90,
}

const normalizeScale = (value) => {
  const scale = Number(value)
  if (!Number.isFinite(scale)) return DEFAULT_PRINT_OPTIONS.scaleFactor
  return Math.max(10, Math.min(200, Math.round(scale)))
}

const applyPrintPageStyle = ({ margin = '8mm' } = {}) => {
  const styleId = 'niceentech-dynamic-print-page'
  let style = document.getElementById(styleId)
  if (!style) {
    style = document.createElement('style')
    style.id = styleId
    document.head.appendChild(style)
  }

  style.textContent = `
@media print {
  @page {
    margin: ${margin};
  }
}`
}

export const printCurrentPage = async (isPrinting, options = {}, pageOptions = {}) => {
  if (typeof window === 'undefined') return

  const printOptions = {
    ...DEFAULT_PRINT_OPTIONS,
    ...options,
    printBackground: true,
    scaleFactor: normalizeScale(options.scaleFactor ?? DEFAULT_PRINT_OPTIONS.scaleFactor),
  }

  applyPrintPageStyle(pageOptions)
  isPrinting.value = true
  await nextTick()

  try {
    if (window.electronAPI?.printReport) {
      const result = await window.electronAPI.printReport(printOptions)
      if (result && result.success === false && result.errorType !== 'Print job canceled') {
        console.warn('[PagePrint] Electron print failed:', result.errorType)
      }
      return
    }

    window.print()
  } finally {
    isPrinting.value = false
  }
}
