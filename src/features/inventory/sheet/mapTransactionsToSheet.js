import { applySheetDate, datePartsFromIso, displayColumnDate, todayIso } from './sheetDate'

export { applySheetDate, datePartsFromIso, displayColumnDate, todayIso } from './sheetDate'

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

export const materialsFromItems = (materialItems) =>
  (materialItems ?? []).map((item) => ({
    id: String(item.id),
    spec: item.spec,
    group: String(item.material_group || item.name || ''),
  }))

const createQuantityMap = (materialItems, source = {}) => {
  const next = {}
  for (const item of materialItems ?? []) {
    const key = String(item.id)
    next[key] = source[key] ?? source[item.id] ?? ''
  }
  return next
}

let columnSeq = 0

export const createEmptyColumn = (side, materialItems) => {
  const transactionDate = todayIso()
  return {
    localId: `col-${++columnSeq}`,
    saved: false,
    transactionId: null,
    transactionType: side === 'in' ? 'incoming' : 'return',
    memo: '',
    manufacturer: '',
    supplier: '',
    quantities: createQuantityMap(materialItems),
    ...datePartsFromIso(transactionDate),
  }
}

const quantitiesFromItems = (items) => {
  const quantities = {}
  for (const item of items ?? []) {
    quantities[String(item.material_item_id)] = item.quantity
  }
  return quantities
}

const signedValues = (quantities) =>
  Object.values(quantities ?? {})
    .map(toNumber)
    .filter((quantity) => quantity !== 0)

const isInboundTransaction = (transaction, quantities) => {
  if (transaction.transaction_type === 'incoming') return true
  if (transaction.transaction_type === 'return' || transaction.transaction_type === 'use') return false
  const values = signedValues(quantities)
  const hasPositive = values.some((quantity) => quantity > 0)
  const hasNegative = values.some((quantity) => quantity < 0)
  if (hasPositive && !hasNegative) return true
  if (hasNegative && !hasPositive) return false
  return hasPositive
}

const toColumn = (transaction, quantities) => ({
  localId: `saved-${transaction.id}`,
  transactionId: transaction.id,
  saved: true,
  transactionType: transaction.transaction_type,
  memo: transaction.memo ?? '',
  manufacturer: transaction.manufacturer ?? '',
  supplier: transaction.supplier ?? '',
  quantities,
  ...datePartsFromIso(transaction.transaction_date),
})

const compareColumnsByDate = (left, right) => {
  const dateCompare = String(left.transactionDate ?? '').localeCompare(String(right.transactionDate ?? ''))
  if (dateCompare !== 0) return dateCompare
  return Number(left.transactionId ?? 0) - Number(right.transactionId ?? 0)
}

export const splitTransactionsToColumns = (transactions, materialItems) => {
  const inboundColumns = []
  const outboundColumns = []

  for (const transaction of transactions ?? []) {
    const quantities = createQuantityMap(materialItems, quantitiesFromItems(transaction.items))
    const values = signedValues(quantities)
    const hasPositive = values.some((quantity) => quantity > 0)
    const hasNegative = values.some((quantity) => quantity < 0)

    if (hasPositive && hasNegative) {
      if (hasPositive) inboundColumns.push(toColumn(transaction, quantities))
      else outboundColumns.push(toColumn(transaction, quantities))
      continue
    }

    const column = toColumn(transaction, quantities)
    if (isInboundTransaction(transaction, quantities)) inboundColumns.push(column)
    else outboundColumns.push(column)
  }

  inboundColumns.sort(compareColumnsByDate)
  outboundColumns.sort(compareColumnsByDate)
  return { inboundColumns, outboundColumns }
}

export const rowsFromExcelParse = (parsedRows, materialItems) => {
  const inboundColumns = []
  const outboundColumns = []
  for (const row of parsedRows ?? []) {
    const quantities = createQuantityMap(materialItems, row.quantities)
    const values = signedValues(quantities)
    const hasPositive = values.some((quantity) => quantity > 0)
    const hasNegative = values.some((quantity) => quantity < 0)
    const base = {
      localId: `col-${++columnSeq}`,
      saved: false,
      transactionId: null,
      memo: row.memo ?? '',
      manufacturer: row.manufacturer ?? '',
      supplier: row.supplier ?? '',
      ...datePartsFromIso(row.transactionDate),
    }
    if (hasPositive) {
      const inboundQuantities = {}
      for (const [key, value] of Object.entries(quantities)) {
        const number = toNumber(value)
        inboundQuantities[key] = number > 0 ? number : ''
      }
      inboundColumns.push({ ...base, localId: `col-${++columnSeq}`, transactionType: 'incoming', quantities: inboundQuantities })
    }
    if (hasNegative) {
      const outboundQuantities = {}
      for (const [key, value] of Object.entries(quantities)) {
        const number = toNumber(value)
        outboundQuantities[key] = number < 0 ? number : ''
      }
      outboundColumns.push({ ...base, localId: `col-${++columnSeq}`, transactionType: 'return', quantities: outboundQuantities })
    }
    if (!hasPositive && !hasNegative) {
      inboundColumns.push({ ...base, transactionType: 'incoming', quantities })
    }
  }
  return { inboundColumns, outboundColumns }
}

export const syncColumnQuantityKeys = (columns, materialItems) =>
  columns.map((column) => ({
    ...column,
    quantities: createQuantityMap(materialItems, column.quantities),
  }))

const signedQuantityForSide = (side, value) => {
  const number = toNumber(value)
  if (number === 0) return ''
  if (side === 'in') return String(Math.abs(number))
  return String(-Math.abs(number))
}

export const normalizeColumnQuantity = (side, value) => signedQuantityForSide(side, value)

export const EMPTY_COLUMN_COUNT = 1

export const columnHasQuantity = (column) =>
  Object.values(column.quantities ?? {}).some((value) => toNumber(value) !== 0)

export const padEmptyColumns = (columns, side, materialItems, count = EMPTY_COLUMN_COUNT) => {
  const next = [...(columns ?? [])]
  const blankCount = next.filter((column) => !column.saved && !columnHasQuantity(column)).length
  if (blankCount >= count) return columns ?? []
  for (let index = blankCount; index < count; index += 1) {
    next.push(createEmptyColumn(side, materialItems))
  }
  return next
}

export const readSheetCellValue = (column, field, materialId) => {
  if (field === 'quantity') return String(column.quantities?.[String(materialId)] ?? '')
  if (field === 'date') return displayColumnDate(column)
  return String(column[field] ?? '')
}

export const writeSheetCellValue = (column, field, materialId, value) => {
  if (field === 'quantity') {
    column.quantities[String(materialId)] = value
    return
  }
  if (field === 'date') applySheetDate(column, value)
  else column[field] = value
}

export const columnsToSaveRows = (inboundColumns, outboundColumns) => {
  const toRow = (column, side) => {
    const quantities = {}
    for (const [key, value] of Object.entries(column.quantities ?? {})) {
      quantities[key] = normalizeColumnQuantity(side, value)
    }
    return {
      localId: column.localId,
      saved: false,
      transactionDate: column.transactionDate,
      transactionType: side === 'in' ? 'incoming' : 'return',
      memo: column.memo ?? '',
      manufacturer: side === 'in' ? column.manufacturer ?? '' : '',
      supplier: side === 'in' ? column.supplier ?? '' : '',
      quantities,
    }
  }

  return [
    ...inboundColumns.filter((column) => !column.saved && columnHasQuantity(column)).map((column) => toRow(column, 'in')),
    ...outboundColumns.filter((column) => !column.saved && columnHasQuantity(column)).map((column) => toRow(column, 'out')),
  ]
}
