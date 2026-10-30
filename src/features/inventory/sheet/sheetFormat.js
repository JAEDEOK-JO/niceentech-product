import { resolveInventoryWorkMemoStatus } from '@/features/inventory/work-status/buildInventoryWorkMemo'

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
  const number = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(number) ? number : 0
}

export const sumIfPositive = (columns, materialId) =>
  columns.reduce((sum, column) => {
    const number = toNumber(column.quantities?.[materialId] ?? column.quantities?.[String(materialId)])
    return number > 0 ? sum + number : sum
  }, 0)

export const sumIfNegative = (columns, materialId) =>
  columns.reduce((sum, column) => {
    const number = toNumber(column.quantities?.[materialId] ?? column.quantities?.[String(materialId)])
    return number < 0 ? sum + number : sum
  }, 0)

export const sumIfNegativeWorking = (columns, materialId) =>
  sumIfNegativeStatus(columns, materialId, '작업중')

export const sumIfNegativeStatus = (columns, materialId, status) =>
  columns.reduce((sum, column) => {
    if (resolveInventoryWorkMemoStatus(column.memo) !== status) return sum
    const number = toNumber(column.quantities?.[materialId] ?? column.quantities?.[String(materialId)])
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
    let groupRowspan = 0
    if (isGroupStart) {
      groupRowspan = 1
      for (let nextIndex = index + 1; nextIndex < materialList.length; nextIndex += 1) {
        if (String(materialList[nextIndex].group || '') !== group) break
        groupRowspan += 1
      }
    }

    return {
      ...material,
      group,
      groupIndex,
      groupTone: `tone-${groupIndex % 4}`,
      groupRowspan,
      renderSpecCell: !group || isGroupStart,
      specLabel: group || material.spec,
      subLabel: group ? material.spec : '',
    }
  })
}

export const remainingAfterAmount = (inbound, amount) => {
  const inboundNumber = toNumber(inbound)
  const amountNumber = toNumber(amount)
  if (inboundNumber === 0 && amountNumber === 0) return null
  return inboundNumber - Math.abs(amountNumber)
}

export const buildSummaries = (materialList, inboundColumns, outboundColumns) => {
  const map = {}
  for (const material of materialList) {
    const inbound = sumIfPositive(inboundColumns, material.id)
    const outbound = sumIfNegative(outboundColumns, material.id)
    const working = sumIfNegativeWorking(outboundColumns, material.id)
    const completed = sumIfNegativeStatus(outboundColumns, material.id, '작업완료')
    map[material.id] = {
      inbound,
      outbound,
      working,
      completed,
      inboundNet: remainingAfterAmount(inbound, outbound),
      workingNet: remainingAfterAmount(inbound, working),
    }
  }
  return map
}
