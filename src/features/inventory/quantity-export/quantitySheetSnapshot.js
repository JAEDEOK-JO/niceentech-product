import { displayInventoryWorkMemo } from '@/features/inventory/work-status/buildInventoryWorkMemo'
import { displayColumnDate } from '@/features/inventory/sheet/sheetDate'
import { QUANTITY_SLOT_COUNT } from './quantitySheetMap.js'

const quantityAmount = (value) => {
  const number = Number(String(value ?? '').replace(/,/g, '').trim())
  if (!Number.isFinite(number) || number === 0) return 0
  return Math.round(Math.abs(number) * 1000) / 1000
}

export const formatQuantitySheetCreatedAt = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}.${month}.${day}`
}

const collectItems = (column, materials, bucket) => {
  for (const material of materials ?? []) {
    const quantity = quantityAmount(column?.quantities?.[material.id] ?? column?.quantities?.[String(material.id)])
    if (!quantity) continue
    const materialGroup = String(material.group ?? '').trim()
    const spec = String(material.spec ?? '').trim()
    if (!materialGroup || !spec) continue
    const key = `${materialGroup}\0${spec}`
    const current = bucket.get(key) ?? { materialGroup, spec, quantity: 0 }
    current.quantity = Math.round((current.quantity + quantity) * 1000) / 1000
    bucket.set(key, current)
  }
}

const columnLabel = (column) => `${displayColumnDate(column)}\0${displayInventoryWorkMemo(column.memo)}`

export const buildQuantitySheetSnapshot = ({ columns, materials, companions = [] }) =>
  (columns ?? []).slice(0, QUANTITY_SLOT_COUNT).map((column, index) => {
    const bucket = new Map()
    collectItems(column, materials, bucket)
    const label = columnLabel(column)
    for (const companion of companions) {
      for (const extra of companion.columns ?? []) {
        if (columnLabel(extra) !== label) continue
        collectItems(extra, companion.materials, bucket)
      }
    }
    return {
      sortOrder: index,
      columnDate: displayColumnDate(column),
      memo: displayInventoryWorkMemo(column.memo),
      items: [...bucket.values()],
    }
  })

const columnItems = (column) =>
  (column.items ?? []).map((item) => ({
    group: item.group ?? item.materialGroup ?? '',
    spec: item.spec ?? '',
    quantity: quantityAmount(item.quantity),
  })).filter((item) => item.quantity && item.group && item.spec)

export const restoreQuantitySheet = ({ siteName, columns }) => {
  const materialIds = new Map()
  const materials = []
  const restoredColumns = [...(columns ?? [])]
    .sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0))
    .map((column) => {
      const quantities = {}
      for (const item of columnItems(column)) {
        const key = `${item.group}\0${item.spec}`
        let materialId = materialIds.get(key)
        if (!materialId) {
          materialId = `snap-${materials.length}`
          materialIds.set(key, materialId)
          materials.push({ id: materialId, group: item.group, spec: item.spec })
        }
        quantities[materialId] = String(item.quantity)
      }
      return {
        date: column.columnDate ?? column.date ?? '',
        memo: column.memo ?? '',
        quantities,
      }
    })

  return {
    siteName: String(siteName ?? ''),
    columns: restoredColumns,
    materials,
  }
}
