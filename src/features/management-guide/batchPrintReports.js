import { printManagementReport } from './reportPrint'
import { applyBatchPrintMode, clearBatchPrintMode } from './batchPrintStyles'

export const BATCH_PRINT_DEPARTMENTS = [
  { key: 'design', name: '설계부' },
  { key: 'production', name: '생산부' },
  { key: 'operations', name: '공무부' },
  { key: 'sales', name: '영업부' },
]

export const BATCH_PRINT_OPTIONS = {
  scaleFactor: 80,
  copies: 9,
  collate: true,
  landscape: true,
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const waitForBatchReportsReady = async (rootEl, { timeoutMs = 20000 } = {}) => {
  const expected = BATCH_PRINT_DEPARTMENTS.length
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const pages = rootEl?.querySelectorAll('.batch-print-item .report-page.report-page-break') ?? []
    if (pages.length >= expected) {
      await sleep(300)
      return
    }
    await sleep(150)
  }
}

export const printBatchManagementReports = async (isPrinting) => {
  applyBatchPrintMode()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('resize'))
  await sleep(400)
  try {
    await printManagementReport(isPrinting, BATCH_PRINT_OPTIONS)
  } finally {
    clearBatchPrintMode()
  }
}
