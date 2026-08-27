import { formatPositiveDecimal, roundToOneDecimal } from '@/features/main/productionPlanNumbers'
import { decimalOnDate, isDateInSpan, qtyOnDate } from './allocateQty'
import {
  formatDayLabel,
  formatMonthDay,
  getInclusiveDayCount,
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
  return Math.max(0, roundToOneDecimal(row?.inch))
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

function toListItem(row, tab, { startedDate, selectedDate, qty, inch }) {
  const elapsedDays = startedDate
    ? getInclusiveDayCount(startedDate, selectedDate)
    : null
  const itemQty = Math.max(0, Math.floor(toNumber(qty)))
  const itemInch = Math.max(0, roundToOneDecimal(inch))
  return {
    id: row.id,
    drawingNo: getDrawingNo(row),
    company: String(row?.company ?? '').trim() || '-',
    place: String(row?.place ?? '').trim() || '-',
    area: String(row?.area ?? '').trim() || '-',
    siteLabel: buildSiteLabel(row) || '-',
    qty: itemQty,
    qtyText: itemQty > 0 ? itemQty.toLocaleString('ko-KR') : '',
    inch: itemInch,
    inchText: tab.showInch ? formatPositiveDecimal(itemInch, { fixed: true }) : '',
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
    const totalQty = getQty(row, tab)
    const totalInch = getInch(row)

    if (completedDate && isDateInSpan(startedDate, completedDate, selected)) {
      completed.push(toListItem(row, tab, {
        startedDate,
        selectedDate: selected,
        qty: qtyOnDate(totalQty, startedDate, completedDate, selected),
        inch: tab.showInch ? decimalOnDate(totalInch, startedDate, completedDate, selected) : 0,
      }))
      continue
    }

    if (!isInProgressStatus(status)) continue
    if (completedDate && completedDate.getTime() <= selected.getTime()) continue
    if (startedDate && startedDate.getTime() > selected.getTime()) continue

    inProgress.push(toListItem(row, tab, {
      startedDate,
      selectedDate: selected,
      qty: totalQty,
      inch: totalInch,
    }))
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
  return roundToOneDecimal((items ?? []).reduce((sum, item) => sum + toNumber(item?.inch), 0))
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
