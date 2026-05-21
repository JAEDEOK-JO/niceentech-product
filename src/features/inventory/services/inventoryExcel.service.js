import * as XLSX from 'xlsx'

const normalizeText = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const compactText = (value) => normalizeText(value).replace(/\s/g, '').toLowerCase()

const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = normalizeText(value).replace(/,/g, '').replace(/[^\d.-]/g, '')
  if (!normalized || normalized === '-' || normalized === '.') return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const extractSpec = (value) => {
  const match = normalizeText(value).match(/(\d+(?:\.\d+)?)/)
  return match ? String(Number(match[1])) : ''
}

const inferTransactionType = (value) => {
  const text = compactText(value)
  if (text.includes('입고')) return 'incoming'
  if (text.includes('반출')) return 'return'
  if (text.includes('사용') || text.includes('출고')) return 'use'
  if (text.includes('조정')) return 'adjustment'
  return ''
}

const inferTransactionTypeFromQuantities = (quantityEntries) => {
  const values = quantityEntries.map((entry) => entry.value).filter((value) => value !== 0)
  if (values.some((value) => value < 0) && values.some((value) => value > 0)) return 'adjustment'
  if (values.some((value) => value < 0)) return 'return'
  return 'incoming'
}

const parseDatePart = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    }
  }
  const number = Math.trunc(toNumber(value))
  return number > 0 ? number : null
}

const toIsoDate = ({ year, month, day }) => {
  if (!year || !month || !day) return ''
  const normalizedYear = year < 100 ? 2000 + year : year
  if (month < 1 || month > 12 || day < 1 || day > 31) return ''
  return [
    String(normalizedYear).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

const findColumn = (row, matcher) => row.findIndex((cell) => matcher(compactText(cell)))

const findHeaderIndex = (rows) =>
  rows.findIndex((row) => {
    const cells = row.map(compactText)
    return cells.some((cell) => cell.includes('순번')) &&
      cells.some((cell) => cell.includes('일자')) &&
      cells.some((cell) => cell.includes('내역'))
  })

const resolveDateColumns = (headerRow, subHeaderRow, typeColumn) => {
  const subColumns = []
  for (let column = 0; column < typeColumn; column += 1) {
    const text = compactText(subHeaderRow[column])
    if (['년', '월', '일'].includes(text)) subColumns.push({ text, column })
  }

  const year = subColumns.find((item) => item.text === '년')?.column
  const month = subColumns.find((item) => item.text === '월')?.column
  const day = subColumns.find((item) => item.text === '일')?.column
  if (year != null && month != null && day != null) return { year, month, day }

  const dateColumn = findColumn(headerRow, (text) => text.includes('일자'))
  if (dateColumn >= 0) return { year: dateColumn, month: dateColumn + 1, day: dateColumn + 2 }
  return { year: -1, month: -1, day: -1 }
}

const createMaterialMap = (materialItems) => {
  const materialMap = new Map()
  for (const item of materialItems ?? []) {
    const group = compactText(item.material_group || item.name)
    const spec = extractSpec(item.spec)
    if (group && spec) materialMap.set(`${group}:${spec}`, item)
  }
  return materialMap
}

const resolveMaterialColumns = ({ headerRow, subHeaderRow, supplierColumn, noteColumn, materialItems }) => {
  const materialMap = createMaterialMap(materialItems)
  const materialColumns = []
  const unmatched = new Set()
  const endColumn = noteColumn >= 0 ? noteColumn : headerRow.length
  let activeGroup = ''

  for (let column = supplierColumn + 1; column < endColumn; column += 1) {
    const top = normalizeText(headerRow[column])
    const sub = normalizeText(subHeaderRow[column])
    const topKey = compactText(top)
    const subKey = compactText(sub)

    if (topKey.includes('sus') || topKey.includes('sts')) {
      activeGroup = 'ignore'
      continue
    }
    if (topKey.includes('#40') || topKey.includes('스케')) {
      activeGroup = '스케쥴'
    }

    let groupName = activeGroup
    let spec = ''

    if (topKey.includes('일반강관')) {
      groupName = '일반강관'
      spec = extractSpec(sub)
    } else if (topKey.includes('스케')) {
      groupName = '스케쥴'
      spec = extractSpec(sub || top)
    } else if (groupName === '스케쥴') {
      spec = extractSpec(sub || top)
    } else if (topKey.includes('a') || /^\d+(?:\.\d+)?$/.test(topKey)) {
      groupName = '일반강관'
      spec = extractSpec(top)
    } else if (subKey.includes('a') && groupName && groupName !== 'ignore') {
      spec = extractSpec(sub)
    }

    if (!groupName || groupName === 'ignore' || !spec) continue

    const item = materialMap.get(`${compactText(groupName)}:${spec}`)
    if (item) {
      materialColumns.push({ column, item })
      continue
    }

    unmatched.add(`${groupName} ${spec}`)
  }

  return {
    materialColumns,
    unmatched: [...unmatched],
  }
}

const isSummaryRow = (row) =>
  row
    .slice(0, 8)
    .map(compactText)
    .some((cell) => ['합계', '입고량계', '출고량계'].includes(cell))

export function parseInventoryExcelRows(rows, materialItems, sheetName = '') {
  const headerIndex = findHeaderIndex(rows)
  if (headerIndex < 0) {
    return {
      sheetName,
      rows: [],
      warnings: ['엑셀에서 순번/일자/내역 헤더를 찾지 못했습니다.'],
    }
  }

  const headerRow = rows[headerIndex] ?? []
  const subHeaderRow = rows[headerIndex + 1] ?? []
  const typeColumn = findColumn(headerRow, (text) => text.includes('내역'))
  const manufacturerColumn = findColumn(headerRow, (text) => text.includes('제조사'))
  const supplierColumn = findColumn(headerRow, (text) => text.includes('입고처') || text.includes('출하일') || text.includes('출고처'))
  const noteColumn = findColumn(headerRow, (text) => text.includes('비고'))
  const dateColumns = resolveDateColumns(headerRow, subHeaderRow, typeColumn)
  const { materialColumns, unmatched } = resolveMaterialColumns({
    headerRow,
    subHeaderRow,
    supplierColumn,
    noteColumn,
    materialItems,
  })
  const parsedRows = []
  const warnings = []
  let lastYear = null

  if (materialColumns.length === 0) {
    warnings.push('현재 자재 목록과 매칭되는 엑셀 자재 컬럼이 없습니다.')
  }
  if (unmatched.length > 0) {
    warnings.push(`현재 등록되지 않아 제외된 자재: ${unmatched.slice(0, 8).join(', ')}${unmatched.length > 8 ? ' 외' : ''}`)
  }

  for (let rowIndex = headerIndex + 2; rowIndex < rows.length; rowIndex += 1) {
    const sourceRow = rows[rowIndex] ?? []
    if (isSummaryRow(sourceRow)) continue

    const yearPart = parseDatePart(sourceRow[dateColumns.year])
    const monthPart = parseDatePart(sourceRow[dateColumns.month])
    const dayPart = parseDatePart(sourceRow[dateColumns.day])
    const explicitYear = yearPart?.year ?? yearPart
    if (explicitYear) lastYear = explicitYear < 100 ? 2000 + explicitYear : explicitYear

    const quantityEntries = materialColumns
      .map(({ column, item }) => ({
        item,
        value: toNumber(sourceRow[column]),
      }))
      .filter((entry) => entry.value !== 0)

    if (quantityEntries.length === 0) continue

    const transactionType = inferTransactionType(sourceRow[typeColumn]) || inferTransactionTypeFromQuantities(quantityEntries)
    const year = explicitYear ?? lastYear
    const month = monthPart?.month ?? monthPart
    const day = dayPart?.day ?? dayPart
    const transactionDate = toIsoDate({ year, month, day })

    if (!transactionDate) {
      warnings.push(`${rowIndex + 1}행은 날짜를 확인하지 못해 제외했습니다.`)
      continue
    }

    const quantities = Object.fromEntries(
      quantityEntries.map((entry) => [String(entry.item.id), String(entry.value)]),
    )

    parsedRows.push({
      sourceSheet: sheetName,
      sourceRowNumber: rowIndex + 1,
      transactionDate,
      transactionType,
      memo: normalizeText(sourceRow[typeColumn]),
      manufacturer: normalizeText(sourceRow[manufacturerColumn]),
      supplier: normalizeText(sourceRow[supplierColumn]),
      quantities,
    })
  }

  return { sheetName, rows: parsedRows, warnings }
}

export async function parseInventoryExcelFile(file, materialItems) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { cellDates: true })
  const sheetName =
    workbook.SheetNames.find((name) => name.includes('원자재') && !name.includes('5%')) ??
    workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  })

  return parseInventoryExcelRows(rows, materialItems, sheetName)
}
