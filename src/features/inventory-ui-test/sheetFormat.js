export const formatQuantity = (value) => {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  return number.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

export const formatBlankZero = (value) => {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) return ''
  return number.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

export const quantityClass = (value, { showZero = false } = {}) => {
  if (value === null || value === undefined || value === '') return 'is-empty'
  const number = Number(value)
  if (!Number.isFinite(number)) return 'is-empty'
  if (number === 0) return showZero ? 'is-zero' : 'is-empty'
  if (number < 0) return 'is-minus'
  return 'is-plus'
}

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export const sumIfPositive = (columns, materialId) =>
  columns.reduce((sum, column) => {
    const number = toNumber(column.quantities?.[materialId])
    return number > 0 ? sum + number : sum
  }, 0)

export const sumIfNegative = (columns, materialId) =>
  columns.reduce((sum, column) => {
    const number = toNumber(column.quantities?.[materialId])
    return number < 0 ? sum + number : sum
  }, 0)

export const buildMaterialRows = (materialList) => {
  const groupIndexByName = new Map()
  let nextIndex = 0

  return materialList.map((material, index) => {
    const group = String(material.group || '')
    if (group && !groupIndexByName.has(group)) {
      groupIndexByName.set(group, nextIndex)
      nextIndex += 1
    }
    const groupIndex = group ? groupIndexByName.get(group) : 0
    const isGroupStart = Boolean(group) && (index === 0 || String(materialList[index - 1].group || '') !== group)
    const groupRowspan = isGroupStart
      ? materialList.filter((item) => String(item.group || '') === group).length
      : 0

    return {
      ...material,
      group,
      groupIndex,
      groupTone: `tone-${groupIndex % 3}`,
      groupRowspan,
      renderSpecCell: !group || isGroupStart,
      specLabel: group || material.spec,
      subLabel: group ? material.spec : '',
    }
  })
}

export const buildSummaries = (materialList, inboundColumns, outboundColumns) => {
  const map = {}
  for (const material of materialList) {
    const inbound = sumIfPositive(inboundColumns, material.id)
    const outbound = sumIfNegative(outboundColumns, material.id)
    map[material.id] = {
      inbound,
      outbound,
      net: inbound === 0 && outbound === 0 ? null : inbound + outbound,
    }
  }
  return map
}
