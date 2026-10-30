import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import {
  QUANTITY_COLUMN_LETTERS,
  QUANTITY_SHEET_NAME,
  buildQuantityRowMap,
  quantityEntriesForColumn,
} from './quantitySheetMap.js'

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const formatAmount = (amount) => String(Math.round(Number(amount) * 1000) / 1000)

const findCell = (xml, address) => {
  const token = `<c r="${address}"`
  const start = xml.indexOf(token)
  if (start < 0) return null

  const openEnd = xml.indexOf('>', start)
  if (openEnd < 0) return null

  const selfClosing = xml[openEnd - 1] === '/'
  const attrs = xml.slice(start + token.length, selfClosing ? openEnd - 1 : openEnd)
  const end = selfClosing ? openEnd + 1 : xml.indexOf('</c>', openEnd) + 4
  if (!selfClosing && end < 4) return null

  return {
    start,
    end,
    attrs,
    inner: selfClosing ? '' : xml.slice(openEnd + 1, end - 4),
  }
}

const styleAttribute = (attrs) => attrs.match(/\ss="[^"]*"/)?.[0] ?? ''

const replaceCell = (xml, address, render) => {
  const cell = findCell(xml, address)
  if (!cell || cell.inner.includes('<f')) return xml
  const next = render(cell)
  if (!next) return xml
  return `${xml.slice(0, cell.start)}${next}${xml.slice(cell.end)}`
}

const cellStyleId = (xml, address) => {
  const cell = findCell(xml, address)
  return cell?.attrs.match(/\ss="(\d+)"/)?.[1] ?? ''
}

const applyCellAlignment = (xf, wrap) => {
  const alignment = `<alignment horizontal="center" vertical="center"${wrap ? ' wrapText="1"' : ''}/>`
  let next = xf.includes('applyAlignment=') ? xf : xf.replace('<xf', '<xf applyAlignment="1"')
  if (/<alignment\b[^>]*\/>/.test(next)) return next.replace(/<alignment\b[^>]*\/>/, alignment)
  if (/<alignment\b[\s\S]*?<\/alignment>/.test(next)) return next.replace(/<alignment\b[\s\S]*?<\/alignment>/, alignment)
  if (next.endsWith('/>')) return next.replace(/\/>$/, `>${alignment}</xf>`)
  return next.replace('</xf>', `${alignment}</xf>`)
}

const createStyleRegistry = (stylesXml) => {
  let xml = stylesXml
  const cache = new Map()
  const cellXfs = () => xml.match(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/)?.[0] ?? ''
  const entries = () => [...cellXfs().matchAll(/<xf\b[^>]*(?:\/>|>[\s\S]*?<\/xf>)/g)].map((match) => match[0])

  const use = (styleId, wrap) => {
    if (!styleId) return ''
    const key = `${styleId}:${wrap ? 1 : 0}`
    if (cache.has(key)) return cache.get(key)
    const source = entries()[Number(styleId)]
    if (!source) return styleId
    const block = cellXfs()
    const count = Number(block.match(/\bcount="(\d+)"/)?.[1] ?? entries().length)
    const open = block.match(/<cellXfs\b[^>]*>/)?.[0]
    if (!open) return styleId
    xml = xml
      .replace(open, open.replace(/\bcount="\d+"/, `count="${count + 1}"`))
      .replace('</cellXfs>', `${applyCellAlignment(source, wrap)}</cellXfs>`)
    const nextId = String(count)
    cache.set(key, nextId)
    return nextId
  }

  return {
    use,
    xml: () => xml,
  }
}

const columnWidth = (sheetXml, columnNumber) => {
  const columns = [...sheetXml.matchAll(/<col\b[^>]*>/g)].map((match) => match[0])
  for (const column of columns) {
    const min = Number(column.match(/\bmin="(\d+)"/)?.[1])
    const max = Number(column.match(/\bmax="(\d+)"/)?.[1] ?? min)
    const width = Number(column.match(/\bwidth="([\d.]+)"/)?.[1])
    if (columnNumber >= min && columnNumber <= max && width) return width
  }
  return 12.625
}

const columnPixels = (width) => Math.floor(((256 * width + Math.floor(128 / 7)) / 256) * 7)

const wrappedLineCount = (text, pixels) => {
  const capacity = Math.max(24, pixels - 8)
  const parts = String(text ?? '').split(/\r?\n/)
  return parts.reduce((lines, part) => {
    if (!part) return lines + 1
    let used = 0
    let partLines = 1
    for (const char of part) {
      const size = char.codePointAt(0) > 255 ? 13 : char === ' ' ? 4 : 7
      if (used > 0 && used + size > capacity) {
        partLines += 1
        used = size
      } else {
        used += size
      }
    }
    return lines + partLines
  }, 0)
}

const setRowHeight = (sheetXml, row, height) =>
  sheetXml.replace(new RegExp(`<row r="${row}"([^>]*)>`), (tag, attrs) => {
    const current = Number(attrs.match(/\bht="([\d.]+)"/)?.[1] ?? 0)
    const next = Math.max(current, height)
    if (attrs.includes('ht="')) return `<row r="${row}"${attrs.replace(/\bht="[\d.]+"/, `ht="${next}"`)}>`
    return `<row r="${row}"${attrs} ht="${next}" customHeight="1">`
  })

const setTextCell = (xml, address, text, styleId = '') => {
  const value = String(text ?? '')
  if (!value.trim()) return xml
  return replaceCell(xml, address, (cell) => {
    const style = styleId ? ` s="${styleId}"` : styleAttribute(cell.attrs)
    return `<c r="${address}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
  })
}

const setNumberCell = (xml, address, amount, styleId = '') =>
  replaceCell(xml, address, (cell) => {
    const style = styleId ? ` s="${styleId}"` : styleAttribute(cell.attrs)
    return `<c r="${address}"${style}><v>${formatAmount(amount)}</v></c>`
  })

const setCachedFormulaValue = (xml, address, amount) => {
  const cell = findCell(xml, address)
  if (!cell || !cell.inner.includes('<f')) return xml
  const value = `<v>${formatAmount(amount)}</v>`
  const inner = /<v>[^<]*<\/v>/.test(cell.inner)
    ? cell.inner.replace(/<v>[^<]*<\/v>/, value)
    : `${cell.inner}${value}`
  return `${xml.slice(0, cell.start)}<c r="${address}"${cell.attrs}>${inner}</c>${xml.slice(cell.end)}`
}

const quantitySheetPath = (workbookXml, relsXml) => {
  const sheetTag = workbookXml.match(/<sheet\b[^>]*name="산출"[^>]*>/)?.[0] ?? ''
  const relationId = sheetTag.match(/\br:id="([^"]+)"/)?.[1]
  const relationTag = relationId
    ? relsXml.match(new RegExp(`<Relationship\\b[^>]*Id="${relationId}"[^>]*>`))?.[0] ?? ''
    : ''
  const target = relationTag.match(/\bTarget="([^"]+)"/)?.[1] ?? ''
  if (!target) throw new Error('산출 시트를 찾지 못했습니다.')
  const clean = target.replace(/^\//, '')
  return clean.startsWith('xl/') ? clean : `xl/${clean}`
}

const enableFullCalcOnLoad = (workbookXml) => {
  if (workbookXml.includes('fullCalcOnLoad')) return workbookXml
  return workbookXml.replace(/<calcPr\b([^>]*)\/>/, '<calcPr$1 fullCalcOnLoad="1"/>')
}

export async function fillQuantityWorkbook(buffer, { columns, materials, siteName, designerName }) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer)
  const workbook = XLSX.read(bytes, { type: 'array' })
  const worksheet = workbook.Sheets[QUANTITY_SHEET_NAME]
  if (!worksheet) throw new Error('산출 시트를 찾지 못했습니다.')

  const rowMap = buildQuantityRowMap(worksheet)
  const zip = await JSZip.loadAsync(bytes)
  const workbookFile = zip.file('xl/workbook.xml')
  const relsFile = zip.file('xl/_rels/workbook.xml.rels')
  if (!workbookFile || !relsFile) throw new Error('산출서 파일을 읽지 못했습니다.')

  const workbookXml = await workbookFile.async('string')
  const relsXml = await relsFile.async('string')
  const sheetFile = zip.file(quantitySheetPath(workbookXml, relsXml))
  if (!sheetFile) throw new Error('산출 시트를 찾지 못했습니다.')

  let sheetXml = await sheetFile.async('string')
  const stylesFile = zip.file('xl/styles.xml')
  const styles = createStyleRegistry(stylesFile ? await stylesFile.async('string') : '')
  const textStyle = (address, wrap) => styles.use(cellStyleId(sheetXml, address), wrap)
  const selected = (columns ?? []).slice(0, QUANTITY_COLUMN_LETTERS.length)
  const dates = [...new Set(selected.map((column) => String(column.date ?? '').trim()).filter(Boolean))]
  if (dates.length === 1) sheetXml = setTextCell(sheetXml, 'C2', dates[0], textStyle('C2', false))
  if (String(siteName ?? '').trim()) sheetXml = setTextCell(sheetXml, 'B4', String(siteName).trim(), textStyle('B4', false))
  if (String(designerName ?? '').trim()) sheetXml = setTextCell(sheetXml, 'C6', String(designerName).trim(), textStyle('C6', false))

  const memoWidth = columnPixels(columnWidth(sheetXml, 5))
  const memoLines = Math.max(1, ...selected.map((column) => wrappedLineCount(column.memo, memoWidth)))
  sheetXml = setRowHeight(sheetXml, 9, memoLines * 18)

  const rowTotals = new Map()
  selected.forEach((column, index) => {
    const letter = QUANTITY_COLUMN_LETTERS[index]
    sheetXml = setTextCell(sheetXml, `${letter}8`, column.date, textStyle(`${letter}8`, false))
    sheetXml = setTextCell(sheetXml, `${letter}9`, column.memo, textStyle(`${letter}9`, true))
    for (const entry of quantityEntriesForColumn(column, materials, rowMap)) {
      const address = `${letter}${entry.row}`
      sheetXml = setNumberCell(sheetXml, address, entry.amount, textStyle(address, false))
      rowTotals.set(entry.row, (rowTotals.get(entry.row) ?? 0) + entry.amount)
    }
  })

  for (const [row, total] of rowTotals) {
    sheetXml = setCachedFormulaValue(sheetXml, `B${row}`, total)
  }

  zip.file(sheetFile.name, sheetXml)
  if (stylesFile) zip.file('xl/styles.xml', styles.xml())
  zip.file('xl/workbook.xml', enableFullCalcOnLoad(workbookXml))
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
