const WORKER_DONE_STATUSES = new Set(['작업완료', '출하완료'])
export const WELDING_INSPECTORS = ['민뚜라', '진민택', '석산', '조경천']
export const DEFAULT_WELDING_REPORT_MANAGERS = ['진민택', '민뚜라']

export const normalizeProductionWorkType = (value) => {
  const text = String(value ?? '').replaceAll(' ', '').trim()
  if (text === '용접/무용접') return '용접/무용접'
  if (text === '전실/입상' || text === '전실입상' || text === '입상/전실' || text === '입상전실') {
    return '전실/입상'
  }
  if (text === '나사') return '나사'
  return '기타'
}

export const getWorkTypeBadgeClass = (value) => {
  const workType = normalizeProductionWorkType(value)
  if (workType === '나사') return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
  if (workType === '전실/입상') return 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200'
  if (workType === '용접/무용접') return 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200'
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
}

export const getWeldingInspectorClass = (value, options = {}) => {
  const includeBorder = options.includeBorder !== false
  const inspector = String(value ?? '').trim()
  if (inspector === '민뚜라') return `${includeBorder ? 'border-cyan-300 ' : ''}bg-cyan-200 text-cyan-950`
  if (inspector === '진민택') return `${includeBorder ? 'border-fuchsia-300 ' : ''}bg-fuchsia-200 text-fuchsia-950`
  if (inspector === '석산') return `${includeBorder ? 'border-amber-300 ' : ''}bg-amber-200 text-amber-950`
  if (inspector === '조경천') return `${includeBorder ? 'border-emerald-300 ' : ''}bg-emerald-200 text-emerald-950`
  return `${includeBorder ? 'border-slate-200 ' : ''}bg-slate-100 text-slate-700`
}

export const isWorkerDoneStatus = (value) => WORKER_DONE_STATUSES.has(String(value ?? '').trim())

export const preserveWorkerDoneStatus = (status) => {
  const text = String(status ?? '').trim()
  return isWorkerDoneStatus(text) ? text : ''
}
