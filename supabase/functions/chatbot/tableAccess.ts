import { tableColumns } from './tableColumns.ts'

export function isReadableTable(name: string) {
  return Object.prototype.hasOwnProperty.call(tableColumns, name)
}
