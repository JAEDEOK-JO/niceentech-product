import { DAILY_WORK_TABS } from './config'
import { buildDailyWorkLists, buildWeeklyCompletedQty, sumListInch, sumListQty } from './classify'
import { formatMonthDay, isSameDay, WEEKDAY_LABELS } from './dates'

const DELAYED_DAY_THRESHOLD = 3

export function processDisplayLabel(tab) {
  return tab.showInch ? `${tab.label}/인치` : tab.label
}

export function buildProcessDaySummary(rows, tab, selectedDate) {
  const lists = buildDailyWorkLists(rows, tab, selectedDate)
  const delayed = lists.inProgress.filter((item) => (item.elapsedDays ?? 0) >= DELAYED_DAY_THRESHOLD)

  return {
    key: tab.key,
    label: tab.label,
    displayLabel: processDisplayLabel(tab),
    qtyUnit: tab.qtyUnit,
    showInch: tab.showInch,
    accent: tab.accent,
    completedCount: lists.completed.length,
    inProgressCount: lists.inProgress.length,
    delayedCount: delayed.length,
    completedQty: sumListQty(lists.completed),
    inProgressQty: sumListQty(lists.inProgress),
    completedInch: sumListInch(lists.completed),
    inProgressInch: sumListInch(lists.inProgress),
    delayed,
  }
}

export function buildAllProcessSummaries(rows, selectedDate) {
  return DAILY_WORK_TABS.map((tab) => buildProcessDaySummary(rows, tab, selectedDate))
}

export function buildSummaryWeekColumns(weekDates, selectedDate) {
  return (weekDates ?? []).map((date) => ({
    key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    weekday: WEEKDAY_LABELS[date.getDay()],
    dateLabel: formatMonthDay(date),
    isSelected: isSameDay(date, selectedDate),
  }))
}

export function buildAllProcessWeeklyCompleted(rows, weekDates) {
  return DAILY_WORK_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    displayLabel: processDisplayLabel(tab),
    qtyUnit: tab.qtyUnit,
    showInch: tab.showInch,
    accent: tab.accent,
    days: buildWeeklyCompletedQty(rows, tab, weekDates),
  }))
}

export function buildDelayedItems(summaries) {
  return (summaries ?? [])
    .flatMap((summary) =>
      (summary.delayed ?? []).map((item) => ({
        ...item,
        rowKey: `${summary.key}-${item.id}`,
        processKey: summary.key,
        processLabel: summary.displayLabel,
        qtyUnit: summary.qtyUnit,
        showInch: summary.showInch,
        accent: summary.accent,
      })),
    )
    .sort((left, right) => (right.elapsedDays ?? 0) - (left.elapsedDays ?? 0) || left.siteLabel.localeCompare(right.siteLabel, 'ko'))
}
