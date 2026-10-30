import { displayInventoryWorkMemo } from '@/features/inventory/work-status/buildInventoryWorkMemo'
import { columnHasDraftContent } from '@/features/inventory/sheet/mapTransactionsToSheet'
import { displayColumnDate } from '@/features/inventory/sheet/sheetDate'
import { fillQuantityWorkbook } from './fillQuantitySheet.js'

const templateUrl = () => `${import.meta.env.BASE_URL}templates/quantity-sheet.xlsx`

const safeFileName = (fileName) => {
  const name = String(fileName || '산출서.xlsx').replace(/[\\/:*?"<>|]/g, ' ').trim()
  return name.toLowerCase().endsWith('.xlsx') ? name : `${name}.xlsx`
}

export const quantityExportColumnRows = (columns) =>
  (columns ?? [])
    .filter((column) => column.saved || columnHasDraftContent(column))
    .map((column) => ({
      localId: column.localId,
      date: displayColumnDate(column),
      memo: displayInventoryWorkMemo(column.memo),
    }))

const preparedColumns = (columns) =>
  (columns ?? []).map((column) => ({
    date: displayColumnDate(column),
    memo: displayInventoryWorkMemo(column.memo),
    quantities: column.quantities ?? {},
  }))

export const quantitySheetDownloadName = ({ company, place, columns }) => {
  const site = [company, place].map((value) => String(value ?? '').trim()).filter(Boolean).join(' ')
  const areas = []
  const seen = new Set()
  for (const column of columns ?? []) {
    const area = displayInventoryWorkMemo(column?.memo).trim()
    if (!area || seen.has(area)) continue
    seen.add(area)
    areas.push(area)
  }
  return [site, areas.join(',')].filter(Boolean).join(' ')
}

const saveWorkbook = (bytes, fileName) => {
  const url = URL.createObjectURL(
    new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = safeFileName(fileName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function downloadPreparedQuantitySheet({ columns, materials, siteName, designerName, fileName }) {
  const response = await fetch(templateUrl())
  if (!response.ok) throw new Error('산출서 파일을 불러오지 못했습니다.')

  const bytes = await fillQuantityWorkbook(await response.arrayBuffer(), {
    columns,
    materials,
    siteName,
    designerName,
  })
  saveWorkbook(bytes, fileName)
}

export async function downloadQuantitySheet({ columns, materials, siteName, fileName }) {
  await downloadPreparedQuantitySheet({
    columns: preparedColumns(columns),
    materials,
    siteName,
    fileName,
  })
}
