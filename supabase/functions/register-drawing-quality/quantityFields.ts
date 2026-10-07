export const COUNT_FIELDS = [
  'a32',
  'a40',
  'a50',
  'a65',
  'm65',
  'm80',
  'm100',
  'm125',
  'm150',
  'm200',
] as const

export type CountField = (typeof COUNT_FIELDS)[number]
export type DrawingQuantities = Record<CountField, number>

const MAIN_FIELDS = ['a32', 'a40', 'a50', 'a65'] as const

export const emptyQuantities = (): DrawingQuantities => ({
  a32: 0,
  a40: 0,
  a50: 0,
  a65: 0,
  m65: 0,
  m80: 0,
  m100: 0,
  m125: 0,
  m150: 0,
  m200: 0,
})

export function normalizeQuantities(raw: unknown): DrawingQuantities {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const quantities = emptyQuantities()

  for (const field of COUNT_FIELDS) {
    const parsed = Number(source[field] ?? 0)
    const rounded = Number.isFinite(parsed) ? Math.round(parsed) : 0
    quantities[field] = Math.min(999, Math.max(0, rounded))
  }

  return quantities
}

export function totalQuantity(quantities: DrawingQuantities) {
  return COUNT_FIELDS.reduce((sum, field) => sum + quantities[field], 0)
}

export function hasMainPipe(quantities: DrawingQuantities) {
  return MAIN_FIELDS.some((field) => quantities[field] > 0)
}

const clampCount = (value: unknown) => {
  const parsed = Number(value ?? 0)
  const rounded = Number.isFinite(parsed) ? Math.round(parsed) : 0
  return Math.min(999, Math.max(0, rounded))
}

export function quantitiesFromDiameterCounts(counts: Record<string, unknown> | null | undefined): DrawingQuantities {
  const source = counts ?? {}
  return {
    a32: clampCount(source['32']),
    a40: clampCount(source['40']),
    a50: clampCount(source['50']),
    a65: clampCount(source['65']),
    m65: 0,
    m80: clampCount(source['80']),
    m100: clampCount(source['100']),
    m125: clampCount(source['125']),
    m150: clampCount(source['150']),
    m200: 0,
  }
}
