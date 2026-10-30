export const QUANTITY_SHEET_NAME = '산출'
export const QUANTITY_COLUMN_LETTERS = ['E', 'F', 'G', 'H', 'I', 'J']
export const QUANTITY_SLOT_COUNT = QUANTITY_COLUMN_LETTERS.length

const SECTION_KEYS = new Set(['용접부속', '나사부속', '특이부속'])

export const normalizeGroupKey = (value) =>
  String(value ?? '')
    .replace(/\r?\n/g, '')
    .replace(/[\s\u00a0]+/g, '')
    .toLowerCase()

export const normalizeSpecKey = (value) => {
  if (value == null || value === '') return ''
  const text = String(value).trim()
  if (!text || text === '-') return ''
  if (/^\d+(?:\.\d+)?$/.test(text)) return `${text}a`
  return text.replace(/\r?\n/g, '').replace(/[\s\u00a0]+/g, '').toLowerCase()
}

const isBareNumber = (value) => /^\d+(?:\.\d+)?$/.test(String(value ?? '').trim())

const cellText = (cell) => {
  if (cell?.v == null || cell.v === '') return ''
  return cell.v
}

export const buildQuantityRowMap = (worksheet) => {
  const map = new Map()
  let groupKey = ''

  for (let row = 1; row <= 220; row += 1) {
    const rawGroup = cellText(worksheet?.[`C${row}`])
    const rawSpec = cellText(worksheet?.[`D${row}`])
    const groupText = String(rawGroup ?? '').trim()
    const specText = String(rawSpec ?? '').trim()
    const compactGroup = normalizeGroupKey(groupText)

    if (!groupText && !specText) continue
    if (groupText.startsWith('※') || specText.startsWith('※') || SECTION_KEYS.has(compactGroup)) {
      if (groupText.startsWith('※') || SECTION_KEYS.has(compactGroup)) groupKey = ''
      continue
    }

    if (compactGroup === '#40' || compactGroup.includes('스케쥴') || compactGroup.includes('스케줄')) {
      groupKey = normalizeGroupKey('스케쥴')
    } else if (isBareNumber(groupText) && !specText) {
      if (!groupKey) groupKey = normalizeGroupKey('일반강관')
    } else if (compactGroup && specText && !isBareNumber(groupText)) {
      groupKey = compactGroup
    }

    const specKey = normalizeSpecKey(specText) || (isBareNumber(groupText) ? normalizeSpecKey(groupText) : '')
    if (!groupKey || !specKey) continue
    map.set(`${groupKey}:${specKey}`, row)
  }

  return map
}

const quantityNumber = (value) => {
  const number = Number(String(value ?? '').replace(/,/g, '').trim())
  if (!Number.isFinite(number) || number === 0) return 0
  return Math.abs(number)
}

export const quantityEntriesForColumn = (column, materials, rowMap) => {
  const amounts = new Map()

  for (const material of materials ?? []) {
    const key = `${normalizeGroupKey(material.group)}:${normalizeSpecKey(material.spec)}`
    const row = rowMap.get(key)
    if (!row) continue
    const amount = quantityNumber(column?.quantities?.[material.id] ?? column?.quantities?.[String(material.id)])
    if (!amount) continue
    amounts.set(row, (amounts.get(row) ?? 0) + amount)
  }

  return [...amounts.entries()].map(([row, amount]) => ({ row, amount }))
}
