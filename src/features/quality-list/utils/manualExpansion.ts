export interface ManualExpansionInput {
  lotNumH2: string
  lotNameH2: string
  lotNumStartH2: string
  lotNumEndH2: string
}

export function emptyManualExpansion(): ManualExpansionInput {
  return {
    lotNumH2: '',
    lotNameH2: '',
    lotNumStartH2: '',
    lotNumEndH2: '',
  }
}

export function hasManualExpansion(input: ManualExpansionInput): boolean {
  return Boolean(
    input.lotNumH2.trim()
    || input.lotNameH2.trim()
    || input.lotNumStartH2.trim()
    || input.lotNumEndH2.trim(),
  )
}

export function shortLotCode(value: string | number | null | undefined): string {
  const text = String(value ?? '').trim()
  if (!text || text === '0') return ''
  return text.length > 3 ? text.slice(-3) : text
}

export function manualExpansionLabel(input: ManualExpansionInput): string {
  const code = shortLotCode(input.lotNumH2)
  const name = input.lotNameH2.trim()
  const start = input.lotNumStartH2.trim()
  const end = input.lotNumEndH2.trim()
  const head = `${code ? `(${code})` : ''}${name}`
  const range = start || end ? `${start}~${end}` : ''
  return [head, range].filter(Boolean).join(' ')
}

export function manualPassNumber(input: ManualExpansionInput): string {
  const name = input.lotNameH2.trim()
  const start = input.lotNumStartH2.trim()
  const end = input.lotNumEndH2.trim()
  const range = start || end ? `${start} ~ ${end}` : ''
  return [name, range].filter(Boolean).join(' ')
}
