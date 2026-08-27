export const PLAN_SORT_COLUMNS = [
  { key: 'initial', label: '도번' },
  { key: 'design_distributed', label: '배포일' },
  { key: 'company', label: '회사명' },
  { key: 'place', label: '현장명' },
  { key: 'area', label: '구역명' },
]

export const DEFAULT_PLAN_SORT_KEY = 'company'
export const DEFAULT_PLAN_SORT_DIR = 'asc'

const TIEBREAKERS = ['company', 'place', 'area']

function compareText(left, right) {
  return String(left ?? '')
    .trim()
    .localeCompare(String(right ?? '').trim(), 'ko', { numeric: true, sensitivity: 'base' })
}

function getDrawingTime(row) {
  const raw = String(row?.drawing_date ?? '').trim()
  if (!raw) return null
  const time = Date.parse(raw)
  return Number.isFinite(time) ? time : null
}

function getSortValue(row, key) {
  if (key === 'design_distributed') return getDrawingTime(row)
  return String(row?.[key] ?? '').trim()
}

function compareByKey(left, right, key) {
  if (key === 'design_distributed') {
    const leftTime = getSortValue(left, key)
    const rightTime = getSortValue(right, key)
    if (leftTime == null && rightTime == null) return 0
    if (leftTime == null) return 1
    if (rightTime == null) return -1
    return leftTime - rightTime
  }
  return compareText(getSortValue(left, key), getSortValue(right, key))
}

export function isPlanSortColumn(key) {
  return PLAN_SORT_COLUMNS.some((column) => column.key === key)
}

export function nextPlanSort(currentKey, currentDir, nextKey) {
  if (!isPlanSortColumn(nextKey)) {
    return { key: currentKey, dir: currentDir }
  }
  if (currentKey === nextKey) {
    return { key: nextKey, dir: currentDir === 'asc' ? 'desc' : 'asc' }
  }
  return { key: nextKey, dir: 'asc' }
}

export function sortPlanRows(rows, sortKey = DEFAULT_PLAN_SORT_KEY, sortDir = DEFAULT_PLAN_SORT_DIR) {
  const key = isPlanSortColumn(sortKey) ? sortKey : DEFAULT_PLAN_SORT_KEY
  const dir = sortDir === 'desc' ? -1 : 1
  return [...(rows ?? [])].sort((left, right) => {
    const primary = compareByKey(left, right, key)
    if (primary !== 0) return primary * dir
    for (const tiebreaker of TIEBREAKERS) {
      if (tiebreaker === key) continue
      const compared = compareByKey(left, right, tiebreaker)
      if (compared !== 0) return compared
    }
    return Number(left?.id ?? 0) - Number(right?.id ?? 0)
  })
}
