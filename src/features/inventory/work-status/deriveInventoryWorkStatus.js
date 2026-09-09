const IDLE_STATUSES = new Set(['', '없음', '작업전'])

const normalizeProcessStatus = (value) => {
  const raw = String(value ?? '').trim()
  if (raw.includes('작업중')) return '작업중'
  if (raw.includes('출하완료')) return '출하완료'
  if (raw.includes('작업완료')) return '작업완료'
  if (IDLE_STATUSES.has(raw)) return ''
  return raw
}

const processStatusesOf = (row) => [
  row?.worker_t,
  row?.worker_nasa,
  row?.worker_main,
  row?.worker_welding,
].map(normalizeProcessStatus)

export const deriveInventoryWorkStatus = (row) => {
  const active = processStatusesOf(row).filter((status) => !IDLE_STATUSES.has(status))
  if (active.length === 0) return ''
  if (active.some((status) => status === '작업중')) return '작업중'
  if (active.every((status) => status === '출하완료')) return '출하완료'
  if (active.every((status) => status === '작업완료' || status === '출하완료')) return '작업완료'
  return '작업중'
}
