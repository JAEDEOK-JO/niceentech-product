type WeldingScheduleSearchRow = {
  initial?: string
  company?: string
  place?: string
  area?: string
  welding_schedule_inspector?: string
  welding_inspector?: string
}

const searchFields: Array<keyof WeldingScheduleSearchRow> = [
  'initial',
  'company',
  'place',
  'area',
  'welding_schedule_inspector',
  'welding_inspector',
]

export const matchesWeldingScheduleSearch = (row: WeldingScheduleSearchRow, query: string) => {
  const needle = String(query ?? '').trim().toLowerCase()
  if (!needle) return true

  return searchFields.some((field) => String(row?.[field] ?? '').toLowerCase().includes(needle))
}
