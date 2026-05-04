const WORKER_DONE_STATUSES = new Set(['작업완료', '출하완료'])

export const normalizeProductionWorkType = (value) => {
  const text = String(value ?? '').replaceAll(' ', '').trim()
  if (text === '용접/무용접') return '용접/무용접'
  if (text === '전실/입상' || text === '전실입상' || text === '입상/전실' || text === '입상전실') {
    return '전실/입상'
  }
  if (text === '나사') return '나사'
  return '기타'
}

export const isWorkerDoneStatus = (value) => WORKER_DONE_STATUSES.has(String(value ?? '').trim())

export const preserveWorkerDoneStatus = (status) => {
  const text = String(status ?? '').trim()
  return isWorkerDoneStatus(text) ? text : ''
}
