/**
 * 영업부 보고서: 수주예정(월별/전체) 필터
 */

export const SALES_REPORT_BASELINE_START = '2026-01-01'

export function isSalesBaselineRow(row, baselineStart = SALES_REPORT_BASELINE_START) {
  const raw = String(row?.registration_month ?? '').trim()
  return Boolean(raw) && raw >= baselineStart
}

/** 선택 월 미확정 */
export function filterExpectedMonthRows(rows) {
  return (rows ?? []).filter((row) => !Boolean(row?.order_confirmed))
}

/** 기준일 이후 미확정 전체 */
export function filterExpectedAllRows(rows, baselineStart = SALES_REPORT_BASELINE_START) {
  return (rows ?? []).filter(
    (row) => isSalesBaselineRow(row, baselineStart) && !Boolean(row?.order_confirmed),
  )
}

export function sumOrderPieceCounts(rows, toNumber) {
  return (rows ?? []).reduce(
    (acc, row) => {
      acc.head += toNumber(row?.total_head_count)
      acc.screw += toNumber(row?.total_screw_count)
      acc.supipe += toNumber(row?.total_supipe_count)
      return acc
    },
    { head: 0, screw: 0, supipe: 0 },
  )
}
