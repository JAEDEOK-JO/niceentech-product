import { formatPositiveDecimal } from '@/features/main/productionPlanNumbers'
import {
  formatDayLabel,
  formatMonthDay,
  getInclusiveDayCount,
  isSameDay,
  parseFlexibleDate,
  startOfDay,
  toNumber,
  WEEKDAY_LABELS,
} from './dates'

function normalizeStatus(value) {
  return String(value ?? '').trim()
}

function isNoneStatus(value) {
  const raw = normalizeStatus(value)
  return !raw || raw === '없음' || raw === '작업전' || raw === '작업지시'
}

function isInProgressStatus(value) {
  return normalizeStatus(value) === '작업중'
}

function isCompletedStatus(value) {
  const raw = normalizeStatus(value)
  if (raw === '작업완료' || raw === '출하완료') return true
  return Boolean(parseFlexibleDate(raw))
}

function getProcessStatus(row, tab) {
  return normalizeStatus(row?.[tab.statusField])
}

function getQty(row, tab) {
  return Math.max(0, Math.floor(toNumber(row?.[tab.qtyField])))
}

function getInch(row) {
  return Math.max(0, toNumber(row?.inch))
}

function getStartedDate(row, tab) {
  if (!tab.startedField) return null
  return parseFlexibleDate(row?.[tab.startedField])
}

function getCompletedDate(row, tab, referenceDate) {
  const fromWorkerTime = parseFlexibleDate(row?.[tab.completedTimeField], referenceDate)
  const fromFinalTime = parseFlexibleDate(row?.[tab.completedFinalTimeField], referenceDate)
  const fromStatus = parseFlexibleDate(row?.[tab.statusField], referenceDate)
  const fromProcessDate = tab.completedField
    ? parseFlexibleDate(row?.[tab.completedField], referenceDate)
    : null

  if (normalizeStatus(row?.[tab.statusField]) === '출하완료') {
    return fromFinalTime ?? fromWorkerTime ?? fromProcessDate ?? fromStatus
  }
  return fromWorkerTime ?? fromProcessDate ?? fromFinalTime ?? fromStatus
}

function buildSiteLabel(row) {
  return [row?.company, row?.place, row?.area]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')
}

function getDrawingNo(row) {
  return String(row?.initial ?? '').trim()
}

function isProcessTarget(row, tab) {
  if (Boolean(row?.hold)) return false
  const status = getProcessStatus(row, tab)
  const startedDate = getStartedDate(row, tab)
  const completedDate = getCompletedDate(row, tab)
  if (isNoneStatus(status) && !startedDate && !completedDate) return false
  if (tab.showInch) return getQty(row, tab) > 0 || getInch(row) > 0 || !isNoneStatus(status)
  return getQty(row, tab) > 0
}

function toListItem(row, tab, { startedDate, selectedDate }) {
  const elapsedDays = startedDate
    ? getInclusiveDayCount(startedDate, selectedDate)
    : null
  return {
    id: row.id,
    drawingNo: getDrawingNo(row),
    company: String(row?.company ?? '').trim() || '-',
    place: String(row?.place ?? '').trim() || '-',
    area: String(row?.area ?? '').trim() || '-',
    siteLabel: buildSiteLabel(row) || '-',
    qty: getQty(row, tab),
    qtyText: getQty(row, tab) > 0 ? getQty(row, tab).toLocaleString('ko-KR') : '',
    inch: getInch(row),
    inchText: tab.showInch ? formatPositiveDecimal(row?.inch) : '',
    startedLabel: startedDate ? formatDayLabel(startedDate) : '',
    elapsedDays,
  }
}

export function buildDailyWorkLists(rows, tab, selectedDate) {
  const selected = startOfDay(selectedDate)
  const inProgress = []
  const completed = []

  for (const row of rows ?? []) {
    if (!isProcessTarget(row, tab)) continue

    const status = getProcessStatus(row, tab)
    const startedDate = getStartedDate(row, tab)
    const completedDate = getCompletedDate(row, tab, selected)

    if (completedDate && isSameDay(completedDate, selected)) {
      completed.push(toListItem(row, tab, { startedDate, selectedDate: selected }))
      continue
    }

    if (!isInProgressStatus(status)) continue
    if (completedDate && completedDate.getTime() <= selected.getTime()) continue
    if (startedDate && startedDate.getTime() > selected.getTime()) continue

    inProgress.push(toListItem(row, tab, { startedDate, selectedDate: selected }))
  }

  inProgress.sort((left, right) => {
    const leftDays = left.elapsedDays ?? -1
    const rightDays = right.elapsedDays ?? -1
    return rightDays - leftDays || left.siteLabel.localeCompare(right.siteLabel, 'ko')
  })
  completed.sort((left, right) => left.siteLabel.localeCompare(right.siteLabel, 'ko'))

  return { inProgress, completed }
}

export function sumListQty(items) {
  return (items ?? []).reduce((sum, item) => sum + toNumber(item?.qty), 0)
}

export function sumListInch(items) {
  return (items ?? []).reduce((sum, item) => sum + toNumber(item?.inch), 0)
}

export function buildWeeklyCompletedQty(rows, tab, weekDates) {
  return (weekDates ?? []).map((date) => {
    const completed = buildDailyWorkLists(rows, tab, date).completed
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      weekday: WEEKDAY_LABELS[date.getDay()],
      dateLabel: formatMonthDay(date),
      qty: sumListQty(completed),
      inch: sumListInch(completed),
    }
  })
}
