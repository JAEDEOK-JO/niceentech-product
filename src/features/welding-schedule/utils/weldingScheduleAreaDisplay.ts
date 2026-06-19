import { normalizeStageStatus, statusClass } from '@/features/main/mainProductionPlanConfig'

type WeldingAreaRow = {
  area?: string
  shipment?: boolean
  worker_welding?: string
  worker_welding_time?: string
  worker_welding_time_final?: string
}

export const formatAreaCompletionDate = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const isoMatched = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatched) {
    const [, , month, day] = isoMatched
    return `${Number(month)}.${Number(day)}`
  }

  const dotYearMatched = raw.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})/)
  if (dotYearMatched) {
    const [, , month, day] = dotYearMatched
    return `${Number(month)}.${Number(day)}`
  }

  const dotMonthMatched = raw.match(/^(\d{1,2})\.(\d{1,2})/)
  if (dotMonthMatched) {
    const [, month, day] = dotMonthMatched
    return `${Number(month)}.${Number(day)}`
  }

  return ''
}

export const getWeldingAreaTone = (row: WeldingAreaRow) => {
  if (Boolean(row?.shipment) || String(row?.worker_welding ?? '').trim() === '출하완료') {
    return '출하완료'
  }
  return normalizeStageStatus(row?.worker_welding)
}

export const getWeldingAreaClass = (row: WeldingAreaRow) => {
  const tone = getWeldingAreaTone(row)
  if (tone === '작업중' || tone === '작업완료' || tone === '출하완료') {
    return statusClass(tone)
  }
  return 'text-slate-800'
}

export const getWeldingAreaLabel = (row: WeldingAreaRow) => {
  const area = String(row?.area ?? '').trim() || '-'
  const tone = getWeldingAreaTone(row)
  let dateLabel = ''

  if (tone === '출하완료') {
    dateLabel = formatAreaCompletionDate(row?.worker_welding_time_final)
  } else if (tone === '작업완료') {
    dateLabel = formatAreaCompletionDate(row?.worker_welding_time)
  }

  return dateLabel ? `${area}(${dateLabel})` : area
}
