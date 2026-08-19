import { supabase } from '@/lib/supabase'
import { DAILY_WORK_ROW_COLUMNS, DAILY_WORK_TABS, PRODUCT_LIST_TABLE } from './config'
import { formatIsoDate, formatMonthDay, formatWorkerDate } from './dates'

function mergeRows(groups) {
  const map = new Map()
  for (const group of groups) {
    for (const row of group ?? []) {
      if (row?.id == null) continue
      map.set(row.id, row)
    }
  }
  return [...map.values()]
}

function buildInProgressFilter() {
  return DAILY_WORK_TABS.map((tab) => `${tab.statusField}.eq.작업중`).join(',')
}

function buildCompletedFilter(isoDate, workerDate, monthDay) {
  const parts = []
  for (const tab of DAILY_WORK_TABS) {
    parts.push(`${tab.completedTimeField}.eq.${workerDate}`)
    parts.push(`${tab.completedTimeField}.eq.${monthDay}`)
    parts.push(`${tab.completedFinalTimeField}.eq.${workerDate}`)
    parts.push(`${tab.completedFinalTimeField}.eq.${monthDay}`)
    if (tab.completedField) parts.push(`${tab.completedField}.eq.${isoDate}`)
  }
  return parts.join(',')
}

function buildOpenWindowFilter(isoDate) {
  return DAILY_WORK_TABS
    .filter((tab) => tab.startedField)
    .map((tab) => {
      if (tab.completedField) {
        return `and(${tab.startedField}.lte.${isoDate},or(${tab.completedField}.is.null,${tab.completedField}.gt.${isoDate}))`
      }
      return `${tab.startedField}.lte.${isoDate}`
    })
    .join(',')
}

function buildWeekCompletedFilter(dates) {
  const parts = []
  const isoList = dates.map((date) => formatIsoDate(date)).join(',')
  for (const tab of DAILY_WORK_TABS) {
    if (tab.completedField) {
      parts.push(`${tab.completedField}.in.(${isoList})`)
    }
    for (const date of dates) {
      const workerDate = formatWorkerDate(date)
      const monthDay = formatMonthDay(date)
      parts.push(`${tab.completedTimeField}.like."${workerDate}*"`)
      parts.push(`${tab.completedFinalTimeField}.like."${workerDate}*"`)
      parts.push(`${tab.completedTimeField}.eq.${monthDay}`)
      parts.push(`${tab.completedFinalTimeField}.eq.${monthDay}`)
    }
  }
  return parts.join(',')
}

export async function fetchDailyWorkRows(selectedDate, weekDates = []) {
  const isoDate = formatIsoDate(selectedDate)
  const workerDate = formatWorkerDate(selectedDate)
  const monthDay = formatMonthDay(selectedDate)
  const selectColumns = DAILY_WORK_ROW_COLUMNS
  const openWindowFilter = buildOpenWindowFilter(isoDate)
  const weekFilter = weekDates.length > 0 ? buildWeekCompletedFilter(weekDates) : ''

  const requests = [
    supabase.from(PRODUCT_LIST_TABLE).select(selectColumns).or(buildInProgressFilter()).order('id', { ascending: true }),
    supabase.from(PRODUCT_LIST_TABLE).select(selectColumns).or(buildCompletedFilter(isoDate, workerDate, monthDay)).order('id', { ascending: true }),
  ]
  if (openWindowFilter) {
    requests.push(
      supabase.from(PRODUCT_LIST_TABLE).select(selectColumns).or(openWindowFilter).order('id', { ascending: true }),
    )
  }
  if (weekFilter) {
    requests.push(
      supabase.from(PRODUCT_LIST_TABLE).select(selectColumns).or(weekFilter).order('id', { ascending: true }),
    )
  }

  const results = await Promise.all(requests)
  const firstError = results.find((result) => result.error)?.error
  if (firstError) {
    throw new Error(firstError.message ?? '작업일지 조회에 실패했습니다.')
  }

  return mergeRows(results.map((result) => result.data))
}
