import { DEFAULT_PRINT_OPTIONS, printCurrentPage } from '@/features/printing/pagePrint'

export const DEFAULT_REPORT_PRINT_OPTIONS = DEFAULT_PRINT_OPTIONS

export const printManagementReport = async (isPrinting, options = {}) => {
  await printCurrentPage(isPrinting, options, { margin: '8mm' })
}
