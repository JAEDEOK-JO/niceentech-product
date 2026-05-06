import { nextTick } from 'vue'

export const DEFAULT_REPORT_PRINT_OPTIONS = {
  printBackground: true,
  landscape: true,
  pageSize: 'A4',
  scaleFactor: 90,
}

const normalizeScale = (value) => {
  const scale = Number(value)
  if (!Number.isFinite(scale)) return DEFAULT_REPORT_PRINT_OPTIONS.scaleFactor
  return Math.max(10, Math.min(200, Math.round(scale)))
}

export const printManagementReport = async (isPrinting, options = {}) => {
  if (typeof window === 'undefined') return

  isPrinting.value = true
  await nextTick()

  try {
    if (window.electronAPI?.printReport) {
      const printOptions = {
        ...DEFAULT_REPORT_PRINT_OPTIONS,
        ...options,
        scaleFactor: normalizeScale(options.scaleFactor ?? DEFAULT_REPORT_PRINT_OPTIONS.scaleFactor),
      }
      const result = await window.electronAPI.printReport(printOptions)
      if (result && result.success === false && result.errorType !== 'Print job canceled') {
        console.warn('[ReportPrint] Electron print failed:', result.errorType)
      }
      return
    }

    window.print()
  } finally {
    isPrinting.value = false
  }
}
