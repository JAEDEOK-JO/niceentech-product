const NAV_DELTA = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
}

export const isSheetNavKey = (key) => Boolean(NAV_DELTA[key])

const cellKey = (side, localId, field, materialId = '') => `${side}:${localId}:${field}:${materialId}`

export const buildSheetNavRows = ({ side, headerKeys, columns, materialIds }) => {
  const columnIds = (columns ?? []).map((column) => column.localId)
  if (columnIds.length === 0) return []

  const headerRows = (headerKeys ?? []).map((field) =>
    columnIds.map((localId) => cellKey(side, localId, field)),
  )
  const quantityRows = (materialIds ?? []).map((materialId) =>
    columnIds.map((localId) => cellKey(side, localId, 'quantity', materialId)),
  )
  return [...headerRows, ...quantityRows]
}

const findCellPosition = (rows, currentKey) => {
  for (let row = 0; row < rows.length; row += 1) {
    const col = rows[row].indexOf(currentKey)
    if (col !== -1) return { row, col }
  }
  return null
}

const cellAt = (rows, row, col) => {
  if (row < 0 || row >= rows.length) return null
  const nextRow = rows[row]
  if (col < 0 || col >= nextRow.length) return null
  return nextRow[col]
}

export const nextSheetCellKey = (inboundRows, outboundRows, currentKey, direction) => {
  const delta = NAV_DELTA[direction]
  if (!delta) return null

  const inboundPosition = findCellPosition(inboundRows, currentKey)
  if (inboundPosition) {
    const next = cellAt(inboundRows, inboundPosition.row + delta.row, inboundPosition.col + delta.col)
    if (next) return next
    if (direction === 'ArrowDown' && inboundPosition.row === inboundRows.length - 1 && outboundRows.length > 0) {
      const col = Math.min(inboundPosition.col, outboundRows[0].length - 1)
      return outboundRows[0][col]
    }
    return null
  }

  const outboundPosition = findCellPosition(outboundRows, currentKey)
  if (!outboundPosition) return null

  const next = cellAt(outboundRows, outboundPosition.row + delta.row, outboundPosition.col + delta.col)
  if (next) return next
  if (direction === 'ArrowUp' && outboundPosition.row === 0 && inboundRows.length > 0) {
    const lastRow = inboundRows[inboundRows.length - 1]
    const col = Math.min(outboundPosition.col, lastRow.length - 1)
    return lastRow[col]
  }
  return null
}
