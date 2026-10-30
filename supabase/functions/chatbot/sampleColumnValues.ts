import { isReadableTable } from './tableAccess.ts'
import { tableColumns } from './tableColumns.ts'

function quoteColumn(column: string) {
  if (/^[a-z_][a-z0-9_]*$/.test(column)) return column
  return `"${column}"`
}

export function sampleSql(look: string) {
  const matched = look.trim().match(/^([a-z_][a-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/)
  if (!matched) return ''
  const table = matched[1]
  const column = matched[2]
  if (!isReadableTable(table)) return ''
  const columns = tableColumns[table].split(',').map((name) => name.trim())
  if (!columns.includes(column)) return ''
  const quoted = quoteColumn(column)
  return `select distinct ${quoted} from ${table} where ${quoted} is not null order by ${quoted} desc limit 8`
}

export function sampleLines(rows: unknown) {
  if (!Array.isArray(rows)) return []
  const lines: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const value = Object.values(row as Record<string, unknown>)[0]
    const text = String(value ?? '').trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    lines.push(text)
  }
  return lines
}
