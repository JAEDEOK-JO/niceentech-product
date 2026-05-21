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

const isCanceledPrint = (result) => (
  result?.errorType === 'Print job canceled' ||
  result?.errorType === 'cancelled' ||
  result?.errorType === 'canceled'
)

const showPrintFailure = (message) => {
  if (typeof window === 'undefined') return
  window.alert(message || '인쇄에 실패했습니다. 프린터 상태와 기본 프린터 설정을 확인해주세요.')
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
      const result = await window.electronAPI.printReport({
        ...printOptions,
        silent: true,
      })
      if (!result || result.success) return

      console.warn('[PagePrint] Electron silent print failed:', result.errorType)

      const fallbackResult = await window.electronAPI.printReport({
        printBackground: true,
        landscape: printOptions.landscape,
        silent: false,
      })
      if (fallbackResult?.success || isCanceledPrint(fallbackResult)) return

      if (!isCanceledPrint(result)) {
        showPrintFailure(`인쇄에 실패했습니다.\n사유: ${fallbackResult?.errorType || result.errorType || '알 수 없음'}`)
      }
      return
    }

    window.print()
  } finally {
    isPrinting.value = false
  }
}
