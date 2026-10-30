const toNumber = (value) => {
  const number = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(number) ? number : 0
}

const columnHasMaterialQuantity = (column, materialId) =>
  toNumber(column?.quantities?.[materialId] ?? column?.quantities?.[String(materialId)]) !== 0

export const defaultCollapsedGroupNames = (materials, inboundColumns, outboundColumns) => {
  const columns = [...(inboundColumns ?? []), ...(outboundColumns ?? [])]
  const hasValueByGroup = new Map()

  for (const material of materials ?? []) {
    const group = String(material.group || '')
    if (!group) continue
    const hasValue = columns.some((column) => columnHasMaterialQuantity(column, material.id))
    hasValueByGroup.set(group, (hasValueByGroup.get(group) ?? false) || hasValue)
  }

  return [...hasValueByGroup.entries()].filter(([, hasValue]) => !hasValue).map(([group]) => group)
}

export const collapseMaterialRows = (rows, collapsedNames) => {
  const collapsed = new Set(collapsedNames ?? [])
  const idsByGroup = new Map()

  for (const row of rows ?? []) {
    if (!row.group) continue
    const ids = idsByGroup.get(row.group) ?? []
    ids.push(row.id)
    idsByGroup.set(row.group, ids)
  }

  return (rows ?? [])
    .filter((row) => !row.group || !collapsed.has(row.group) || row.renderSpecCell)
    .map((row) => {
      if (!row.group || !collapsed.has(row.group)) return { ...row, collapsed: false }
      return {
        ...row,
        collapsed: true,
        groupRowspan: 1,
        groupMaterialIds: idsByGroup.get(row.group) ?? [row.id],
      }
    })
}

export const sumColumnQuantities = (column, materialIds) =>
  (materialIds ?? []).reduce(
    (sum, materialId) =>
      sum + toNumber(column?.quantities?.[materialId] ?? column?.quantities?.[String(materialId)]),
    0,
  )

export const sumSummaryField = (summaries, materialIds, field) => {
  let sum = 0
  let hasNumber = false
  for (const materialId of materialIds ?? []) {
    const value = summaries?.[materialId]?.[field]
    if (value === null || value === undefined || value === '') continue
    const number = toNumber(value)
    if (!number) continue
    hasNumber = true
    sum += number
  }
  return hasNumber ? sum : null
}
