import { TARGET_DIAMETERS } from './quantitySchemas.ts'

export type RecordStatus = 'included' | 'excluded' | 'uncertain'

export type PipeRecord = {
  key: string
  pdf_page: number
  scope: string
  pipe_no: string
  pipe_part: string
  location: string
  region: { x0: number; y0: number; x1: number; y1: number }
  body_diameter: string
  has_hole: 'yes' | 'no' | 'unknown'
  total_length: string
  hole_dimension: string
  ea_text: string
  set_text: string
  multiplier: number
  multiplier_basis: string
  status: RecordStatus
  reason: string
  source: 'page' | 'zoom'
  check_note: string
}

export type DiameterCounts = Record<(typeof TARGET_DIAMETERS)[number], number>

const MAX_MULTIPLIER = 999

const asText = (value: unknown) => String(value ?? '').trim()

export const emptyDiameterCounts = (): DiameterCounts =>
  Object.fromEntries(TARGET_DIAMETERS.map((diameter) => [diameter, 0])) as DiameterCounts

function isTargetDiameter(value: string): value is keyof DiameterCounts {
  return (TARGET_DIAMETERS as readonly string[]).includes(value)
}

function identityKey(record: PipeRecord) {
  return [record.pdf_page, record.scope, record.pipe_no, record.pipe_part, record.location]
    .map((part) => asText(part).replace(/\s+/g, ''))
    .join('|')
}

export function normalizeRecord(raw: Record<string, unknown>, pdfPage: number, key: string, source: 'page' | 'zoom'): PipeRecord {
  const region = (raw.region ?? {}) as Record<string, unknown>
  const multiplier = Number(raw.multiplier)
  const record: PipeRecord = {
    key,
    pdf_page: pdfPage,
    scope: asText(raw.scope),
    pipe_no: asText(raw.pipe_no),
    pipe_part: asText(raw.pipe_part),
    location: asText(raw.location),
    region: {
      x0: Number(region.x0) || 0,
      y0: Number(region.y0) || 0,
      x1: Number(region.x1) || 0,
      y1: Number(region.y1) || 0,
    },
    body_diameter: asText(raw.body_diameter),
    has_hole: raw.has_hole === 'yes' || raw.has_hole === 'no' ? raw.has_hole : 'unknown',
    total_length: asText(raw.total_length),
    hole_dimension: asText(raw.hole_dimension),
    ea_text: asText(raw.ea_text),
    set_text: asText(raw.set_text),
    multiplier: Number.isInteger(multiplier) ? multiplier : 0,
    multiplier_basis: asText(raw.multiplier_basis),
    status: raw.status === 'included' || raw.status === 'excluded' ? raw.status : 'uncertain',
    reason: asText(raw.reason),
    source,
    check_note: '',
  }

  if (record.status !== 'included') return record

  const downgrade = (note: string) => {
    record.status = 'uncertain'
    record.check_note = note
  }

  if (record.body_diameter === '25' || record.body_diameter === 'other') {
    record.status = 'excluded'
    record.check_note = '대상 관경 아님'
  } else if (!isTargetDiameter(record.body_diameter)) {
    downgrade('본체 관경 미확정')
  } else if (record.has_hole !== 'yes') {
    downgrade('구멍 가공 미확정')
  } else if (!record.hole_dimension) {
    downgrade('구멍 위치 치수 없음')
  } else if (record.multiplier < 1 || record.multiplier > MAX_MULTIPLIER) {
    downgrade('배수 범위 오류')
  }

  return record
}

export function markDuplicateRecords(records: PipeRecord[]) {
  const seen = new Set<string>()
  for (const record of records) {
    if (record.status !== 'included') continue
    const identity = identityKey(record)
    if (seen.has(identity)) {
      record.status = 'uncertain'
      record.check_note = '같은 페이지에 같은 식별값의 기록이 중복됨'
      continue
    }
    seen.add(identity)
  }
  return records
}

export function sumIncludedRecords(records: PipeRecord[]) {
  const counts = emptyDiameterCounts()
  for (const record of records) {
    if (record.status !== 'included' || !isTargetDiameter(record.body_diameter)) continue
    counts[record.body_diameter] += record.multiplier
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  return { counts, total }
}

export function sumByPage(records: PipeRecord[]) {
  const pages = new Map<number, DiameterCounts>()
  for (const record of records) {
    if (record.status !== 'included' || !isTargetDiameter(record.body_diameter)) continue
    const counts = pages.get(record.pdf_page) ?? emptyDiameterCounts()
    counts[record.body_diameter] += record.multiplier
    pages.set(record.pdf_page, counts)
  }
  return pages
}
