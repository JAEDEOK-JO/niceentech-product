import type { QualityCountField } from '../services/quality.service'
import type { QualityListRow } from '../types/quality'

export interface QualityCountColumn {
  label: string
  field: QualityCountField
  valueKey: keyof QualityListRow
  cancelKey: keyof QualityListRow
  returnKey: keyof QualityListRow
  metric: boolean
}

export const QUALITY_COUNT_COLUMNS: QualityCountColumn[] = [
  { label: '32A', field: 'a32', valueKey: 'a32', cancelKey: 'a32Cancel', returnKey: 'a32Return', metric: false },
  { label: '40A', field: 'a40', valueKey: 'a40', cancelKey: 'a40Cancel', returnKey: 'a40Return', metric: false },
  { label: '50A', field: 'a50', valueKey: 'a50', cancelKey: 'a50Cancel', returnKey: 'a50Return', metric: false },
  { label: '65A', field: 'a65', valueKey: 'a65', cancelKey: 'a65Cancel', returnKey: 'a65Return', metric: false },
  { label: '65A', field: 'm65', valueKey: 'm65', cancelKey: 'm65Cancel', returnKey: 'm65Return', metric: true },
  { label: '80A', field: 'm80', valueKey: 'm80', cancelKey: 'm80Cancel', returnKey: 'm80Return', metric: true },
  { label: '100A', field: 'm100', valueKey: 'm100', cancelKey: 'm100Cancel', returnKey: 'm100Return', metric: true },
  { label: '125A', field: 'm125', valueKey: 'm125', cancelKey: 'm125Cancel', returnKey: 'm125Return', metric: true },
  { label: '150A', field: 'm150', valueKey: 'm150', cancelKey: 'm150Cancel', returnKey: 'm150Return', metric: true },
  { label: '200A', field: 'm200', valueKey: 'm200', cancelKey: 'm200Cancel', returnKey: 'm200Return', metric: true },
]

export function cancelFieldKey(field: QualityCountField): keyof QualityListRow {
  return `${field}Cancel` as keyof QualityListRow
}

export function returnFieldKey(field: QualityCountField): keyof QualityListRow {
  return `${field}Return` as keyof QualityListRow
}
