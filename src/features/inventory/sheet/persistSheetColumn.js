import {
  columnHasQuantity,
  columnsToSaveRows,
  normalizeColumnQuantity,
} from './mapTransactionsToSheet'
import {
  saveInventorySheetRows,
  updateInventoryTransactionHeader,
  updateInventoryTransactionItemQuantity,
} from '@/features/inventory/services/inventory.service'

const persistLocks = new Map()

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const inferTypeFromQuantities = (quantities) => {
  const values = Object.values(quantities ?? {}).map(toNumber).filter((quantity) => quantity !== 0)
  if (values.some((quantity) => quantity < 0) && values.some((quantity) => quantity > 0)) return 'adjustment'
  if (values.some((quantity) => quantity < 0)) return 'return'
  return 'incoming'
}

const headerDbField = {
  date: 'transaction_date',
  memo: 'memo',
  manufacturer: 'manufacturer',
  supplier: 'supplier',
}

export const persistNewColumn = async (side, column, materialItems, company, materialType) => {
  if (column.saved || !columnHasQuantity(column)) return { column, inserted: false }

  const lockKey = column.localId
  if (persistLocks.has(lockKey)) {
    await persistLocks.get(lockKey)
    return { column, inserted: false }
  }

  const task = (async () => {
    const inbound = side === 'in' ? [column] : []
    const outbound = side === 'out' ? [column] : []
    const rows = columnsToSaveRows(inbound, outbound)
    if (rows.length === 0) return { column, inserted: false }
    const savedIds = await saveInventorySheetRows(rows, materialItems, company, materialType)
    column.saved = true
    column.transactionId = savedIds[0]
    return { column, inserted: true }
  })()

  persistLocks.set(lockKey, task)
  try {
    return await task
  } finally {
    persistLocks.delete(lockKey)
  }
}

export const persistImportedColumns = async (inboundColumns, outboundColumns, materialItems, company, materialType) => {
  const rows = columnsToSaveRows(inboundColumns, outboundColumns)
  if (rows.length === 0) return []
  return saveInventorySheetRows(rows, materialItems, company, materialType)
}

export const persistSavedCell = async (payload) => {
  const { column, field, materialId, side } = payload
  if (!column.saved || !column.transactionId) return column

  if (field === 'quantity') {
    const quantity = toNumber(normalizeColumnQuantity(side, column.quantities[String(materialId)]))
    const nextQuantities = {
      ...column.quantities,
      [String(materialId)]: quantity ? String(quantity) : '',
    }
    const transactionType = inferTypeFromQuantities(nextQuantities)
    await updateInventoryTransactionItemQuantity(column.transactionId, materialId, quantity, transactionType)
    column.quantities = nextQuantities
    if (transactionType) column.transactionType = transactionType
    return column
  }

  const dbField = headerDbField[field]
  if (!dbField) return column
  const nextValue = field === 'date' ? column.transactionDate : column[field]
  await updateInventoryTransactionHeader(column.transactionId, dbField, nextValue ?? '')
  return column
}
