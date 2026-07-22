export const PRODUCTION_REQUEST_RECIPIENTS = ['쩌민튼', '민뚜라', '압둘라'] as const

export type ProductionRequestRecipient = (typeof PRODUCTION_REQUEST_RECIPIENTS)[number]

export const PRODUCTION_REQUEST_TYPES = [
  { id: 'production_check', label: '생산확인' },
  { id: 'urgent', label: '긴급요청' },
] as const

export type ProductionRequestTypeId = (typeof PRODUCTION_REQUEST_TYPES)[number]['id']

export const PRODUCTION_REQUEST_FILE_TYPE = 'production_request'
export const PRODUCTION_CONFIRM_FILE_TYPE = 'production_confirm'
export const PRODUCTION_RECHECK_FILE_TYPE = 'production_recheck'

export const CONFIRM_PROGRESS_OPTIONS = [
  { id: '1m', label: '1분후', kind: 'progress' as const },
  { id: '1h', label: '1시간이내', kind: 'progress' as const },
  { id: '3h', label: '3시간이내', kind: 'progress' as const },
  { id: '5h', label: '5시간이내', kind: 'progress' as const },
  { id: 'next_morning', label: '다음날오전', kind: 'progress' as const },
  { id: 'next_afternoon', label: '다음날오후', kind: 'progress' as const },
] as const

export const CONFIRM_PROGRESS_OPTION_IDS = CONFIRM_PROGRESS_OPTIONS.map((item) => item.id)

export function isConfirmProgressOption(optionId: string): boolean {
  return (CONFIRM_PROGRESS_OPTION_IDS as readonly string[]).includes(optionId)
}

export const CONFIRM_DONE_OPTIONS = [
  { id: 'work_done', label: '작업완료', kind: 'done' as const },
  { id: 'welding_done', label: '용접완료', kind: 'done' as const },
] as const

export type ConfirmOptionId =
  | (typeof CONFIRM_PROGRESS_OPTIONS)[number]['id']
  | (typeof CONFIRM_DONE_OPTIONS)[number]['id']

export type ProductionRequestConfirmation = {
  confirmedAt: string
  confirmedById: string
  confirmedByName: string
  optionId: ConfirmOptionId
  optionLabel: string
  status: 'in_progress' | 'work_done' | 'welding_done'
  recheckAt?: string
}

export type ProductionDrawingItem = { id: number; name: string; viewUrl: string }

export type ProductionRequestPayload = {
  v: 1
  kind?: 'request'
  productId: number
  initial: string
  name: string
  company: string
  place: string
  area: string
  testDate: string
  hasDrawing: boolean
  drawingUrl: string
  drawings: ProductionDrawingItem[]
  requestType: ProductionRequestTypeId
  requestTypeLabel: string
  requestText: string
  recipients: string[]
  confirmation?: ProductionRequestConfirmation | null
}

export type ProductionConfirmPayload = {
  v: 1
  kind: 'confirm'
  sourceMessageId: string
  productId: number
  initial: string
  testDate: string
  company: string
  place: string
  area: string
  hasDrawing: boolean
  drawingUrl: string
  drawings: ProductionDrawingItem[]
  requestTypeLabel: string
  requestText: string
  recipients: string[]
  confirmedAt: string
  confirmedByName: string
  optionId: ConfirmOptionId
  optionLabel: string
  status: 'in_progress' | 'work_done' | 'welding_done'
  recheckAt?: string
  /** 후속 작업확인으로 대체되면 true — 버튼 숨김 */
  closed?: boolean
}

export type ProductionRecheckPayload = {
  v: 1
  kind: 'recheck'
  sourceMessageId: string
  productId: number
  initial: string
  testDate: string
  company: string
  place: string
  area: string
  hasDrawing: boolean
  drawingUrl: string
  drawings: ProductionDrawingItem[]
  requestTypeLabel: string
  requestText: string
  recipients: string[]
  /** 후속 작업확인으로 대체되면 true — 버튼 숨김/비활성 */
  closed?: boolean
}

export function getProductionRequestTypeLabel(typeId: string): string {
  const found = PRODUCTION_REQUEST_TYPES.find((item) => item.id === typeId)
  if (found?.label) return found.label
  const fallback = String(typeId ?? '').trim()
  return fallback || '요청'
}

export function getConfirmOptionLabel(optionId: string): string {
  const all = [...CONFIRM_PROGRESS_OPTIONS, ...CONFIRM_DONE_OPTIONS]
  return all.find((item) => item.id === optionId)?.label ?? optionId
}

export function serializeProductionRequest(payload: ProductionRequestPayload): string {
  return JSON.stringify(payload)
}

export function serializeProductionConfirm(payload: ProductionConfirmPayload): string {
  return JSON.stringify(payload)
}

export function serializeProductionRecheck(payload: ProductionRecheckPayload): string {
  return JSON.stringify(payload)
}

const parseDrawings = (raw: unknown, drawingUrl = ''): ProductionDrawingItem[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((file: { id?: unknown; name?: unknown; viewUrl?: unknown }) => ({
        id: Number(file?.id ?? 0),
        name: String(file?.name ?? '').trim(),
        viewUrl: String(file?.viewUrl ?? '').trim(),
      }))
      .filter((file) => file.viewUrl)
  }
  const url = String(drawingUrl ?? '').trim()
  return url ? [{ id: 0, name: '', viewUrl: url }] : []
}

const parseConfirmation = (raw: unknown): ProductionRequestConfirmation | null => {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const confirmedAt = String(row.confirmedAt ?? '').trim()
  const confirmedByName = String(row.confirmedByName ?? '').trim()
  if (!confirmedAt || !confirmedByName) return null
  return {
    confirmedAt,
    confirmedById: String(row.confirmedById ?? '').trim(),
    confirmedByName,
    optionId: String(row.optionId ?? '').trim() as ConfirmOptionId,
    optionLabel: String(row.optionLabel ?? '').trim(),
    status: (String(row.status ?? 'in_progress') as ProductionRequestConfirmation['status']),
    recheckAt: String(row.recheckAt ?? '').trim() || undefined,
  }
}

export function parseProductionRequest(content: unknown): ProductionRequestPayload | null {
  try {
    const raw = typeof content === 'string' ? JSON.parse(content) : content
    if (!raw || raw.v !== 1 || !raw.productId) return null
    if (raw.kind === 'confirm' || raw.kind === 'recheck') return null
    const requestType = String(raw.requestType ?? 'production_check').trim() as ProductionRequestTypeId
    const requestTypeLabel =
      String(raw.requestTypeLabel ?? '').trim() || getProductionRequestTypeLabel(requestType)
    const drawingUrl = String(raw.drawingUrl ?? '').trim()
    return {
      v: 1,
      kind: 'request',
      productId: Number(raw.productId),
      initial: String(raw.initial ?? '').trim(),
      name: String(raw.name ?? '').trim(),
      company: String(raw.company ?? '').trim(),
      place: String(raw.place ?? '').trim(),
      area: String(raw.area ?? '').trim(),
      testDate: String(raw.testDate ?? '').trim(),
      hasDrawing: Boolean(raw.hasDrawing),
      drawingUrl,
      drawings: parseDrawings(raw.drawings, drawingUrl),
      requestType,
      requestTypeLabel,
      requestText: String(raw.requestText ?? '').trim(),
      recipients: Array.isArray(raw.recipients)
        ? raw.recipients.map((item: unknown) => String(item ?? '').trim()).filter(Boolean)
        : [],
      confirmation: parseConfirmation(raw.confirmation),
    }
  } catch {
    return null
  }
}

export function parseProductionConfirm(content: unknown): ProductionConfirmPayload | null {
  try {
    const raw = typeof content === 'string' ? JSON.parse(content) : content
    if (!raw || raw.v !== 1 || raw.kind !== 'confirm') return null
    const drawingUrl = String(raw.drawingUrl ?? '').trim()
    return {
      v: 1,
      kind: 'confirm',
      sourceMessageId: String(raw.sourceMessageId ?? '').trim(),
      productId: Number(raw.productId),
      initial: String(raw.initial ?? '').trim(),
      testDate: String(raw.testDate ?? '').trim(),
      company: String(raw.company ?? '').trim(),
      place: String(raw.place ?? '').trim(),
      area: String(raw.area ?? '').trim(),
      hasDrawing: Boolean(raw.hasDrawing),
      drawingUrl,
      drawings: parseDrawings(raw.drawings, drawingUrl),
      requestTypeLabel: String(raw.requestTypeLabel ?? '').trim(),
      requestText: String(raw.requestText ?? '').trim(),
      recipients: Array.isArray(raw.recipients)
        ? raw.recipients.map((item: unknown) => String(item ?? '').trim()).filter(Boolean)
        : [],
      confirmedAt: String(raw.confirmedAt ?? '').trim(),
      confirmedByName: String(raw.confirmedByName ?? '').trim(),
      optionId: String(raw.optionId ?? '').trim() as ConfirmOptionId,
      optionLabel: String(raw.optionLabel ?? '').trim(),
      status: String(raw.status ?? 'in_progress') as ProductionConfirmPayload['status'],
      recheckAt: String(raw.recheckAt ?? '').trim() || undefined,
      closed: Boolean(raw.closed),
    }
  } catch {
    return null
  }
}

export function parseProductionRecheck(content: unknown): ProductionRecheckPayload | null {
  try {
    const raw = typeof content === 'string' ? JSON.parse(content) : content
    if (!raw || raw.v !== 1 || raw.kind !== 'recheck') return null
    const drawingUrl = String(raw.drawingUrl ?? '').trim()
    return {
      v: 1,
      kind: 'recheck',
      sourceMessageId: String(raw.sourceMessageId ?? '').trim(),
      productId: Number(raw.productId),
      initial: String(raw.initial ?? '').trim(),
      testDate: String(raw.testDate ?? '').trim(),
      company: String(raw.company ?? '').trim(),
      place: String(raw.place ?? '').trim(),
      area: String(raw.area ?? '').trim(),
      hasDrawing: Boolean(raw.hasDrawing),
      drawingUrl,
      drawings: parseDrawings(raw.drawings, drawingUrl),
      requestTypeLabel: String(raw.requestTypeLabel ?? '재확인 요청').trim() || '재확인 요청',
      requestText: String(raw.requestText ?? '').trim(),
      recipients: Array.isArray(raw.recipients)
        ? raw.recipients.map((item: unknown) => String(item ?? '').trim()).filter(Boolean)
        : [],
      closed: Boolean(raw.closed),
    }
  } catch {
    return null
  }
}

export function isProductionRequestMessage(msg: { file_type?: string; content?: string } | null) {
  if (!msg) return false
  if (String(msg.file_type ?? '') === PRODUCTION_REQUEST_FILE_TYPE) return true
  return Boolean(parseProductionRequest(msg.content))
}

export function isProductionConfirmMessage(msg: { file_type?: string; content?: string } | null) {
  if (!msg) return false
  if (String(msg.file_type ?? '') === PRODUCTION_CONFIRM_FILE_TYPE) return true
  return Boolean(parseProductionConfirm(msg.content))
}

export function isProductionRecheckMessage(msg: { file_type?: string; content?: string } | null) {
  if (!msg) return false
  if (String(msg.file_type ?? '') === PRODUCTION_RECHECK_FILE_TYPE) return true
  return Boolean(parseProductionRecheck(msg.content))
}

/** Asia/Seoul 기준 재확인 예정 시각 */
export function computeRecheckAt(optionId: ConfirmOptionId, from = new Date()): string | null {
  if (optionId === '1m') {
    const next = new Date(from)
    next.setMinutes(next.getMinutes() + 1)
    return next.toISOString()
  }
  if (optionId === '1h') {
    const next = new Date(from)
    next.setHours(next.getHours() + 1)
    return next.toISOString()
  }
  if (optionId === '3h') {
    const next = new Date(from)
    next.setHours(next.getHours() + 3)
    return next.toISOString()
  }
  if (optionId === '5h') {
    const next = new Date(from)
    next.setHours(next.getHours() + 5)
    return next.toISOString()
  }

  // 다음날 오전 09:00 KST / 오후 14:00 KST
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(from)
  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  const d = Number(parts.find((p) => p.type === 'day')?.value)
  if (!y || !m || !d) return null

  if (optionId === 'next_morning') {
    // 09:00 KST = 00:00 UTC
    return new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0)).toISOString()
  }
  if (optionId === 'next_afternoon') {
    // 14:00 KST = 05:00 UTC
    return new Date(Date.UTC(y, m - 1, d + 1, 5, 0, 0)).toISOString()
  }
  return null
}

export function formatConfirmDateTime(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
}
