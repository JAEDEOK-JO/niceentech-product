import { isReadableTable } from './tableAccess.ts'

const FUNCTIONS = new Set([
  'count', 'sum', 'avg', 'min', 'max', 'coalesce', 'nullif',
  'btrim', 'trim', 'lower', 'upper', 'length', 'char_length',
  'substring', 'left', 'right', 'replace', 'strpos', 'split_part',
  'date_trunc', 'date_part', 'extract', 'timezone', 'to_char', 'to_date', 'to_timestamp',
  'cast', 'date', 'make_date', 'concat', 'concat_ws',
  'greatest', 'least', 'abs', 'round', 'ceil', 'floor',
  'string_agg', 'bool_or', 'bool_and', 'filter', 'over', 'now', 'row_number',
  'where', 'and', 'or', 'not', 'in', 'on', 'select', 'from', 'join', 'having',
  'when', 'then', 'else', 'case', 'exists', 'between', 'like', 'ilike', 'is',
  'as', 'at', 'time', 'zone', 'interval', 'similar',
])

const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|grant|revoke|truncate|copy|create|comment|execute|call|do|set|reset|into|auth|storage|vault|information_schema|pg_catalog|realtime|pg_|dblink|current_setting|set_config|chatbot_)\b/i

const FROM_ARGUMENT_FUNCTIONS = new Set(['extract', 'substring', 'trim'])

function stripComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n\r]*/g, ' ')
}

function enclosingFunction(sql: string, index: number) {
  let depth = 0
  for (let i = index - 1; i >= 0; i -= 1) {
    if (sql[i] === ')') depth += 1
    if (sql[i] !== '(') continue
    if (depth === 0) return (sql.slice(0, i).match(/([a-z_][a-z0-9_]*)\s*$/i)?.[1] ?? '').toLowerCase()
    depth -= 1
  }
  return ''
}

function readTables(sql: string) {
  return [...sql.matchAll(/\b(from|join)\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)]
    .filter((match) => match[1].toLowerCase() === 'join' || !FROM_ARGUMENT_FUNCTIONS.has(enclosingFunction(sql, match.index ?? 0)))
    .map((match) => match[2].toLowerCase())
}

export function guardSql(raw: string) {
  let sql = stripComments(raw).trim()
  if (sql.endsWith(';')) sql = sql.slice(0, -1).trim()
  if (!sql || sql.length > 2000) throw new Error('unsafe_sql')
  if (/[;]|--|\/\*|\*\/|\$/.test(sql)) throw new Error('unsafe_sql')
  if (!/^\s*select\s/i.test(sql)) throw new Error('select_only')
  if (FORBIDDEN.test(sql) || /\bpassword\b/i.test(sql)) throw new Error('unsafe_sql')

  const tables = readTables(sql)
  const unknown = tables.find((table) => !isReadableTable(table))
  if (!tables.length || unknown) throw new Error(`unknown_table:${unknown ?? ''}`)

  const functions = [...sql.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/gi)].map((match) => match[1].toLowerCase())
  const blocked = functions.find((name) => !FUNCTIONS.has(name))
  if (blocked) throw new Error(`unknown_function:${blocked}`)

  return sql
}
