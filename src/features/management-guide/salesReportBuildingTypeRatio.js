/**
 * 영업부 보고서: 당월 확정수주+수주예정 헤드 기준 건물종류 비중
 */

export function sumHeadCount(rows, toNumber) {
  return (rows ?? []).reduce((sum, row) => sum + toNumber(row?.total_head_count), 0)
}

/** 비아파트 헤드 ÷ 당월 확정+예정 헤드 전체 (%) */
export function calcNonApartmentHeadRatio(rows, { toNumber, isNonApartment }) {
  const total = sumHeadCount(rows, toNumber)
  if (!total) return 0
  const nonApartmentHeads = sumHeadCount(
    (rows ?? []).filter((row) => isNonApartment(row)),
    toNumber,
  )
  return Math.round((nonApartmentHeads / total) * 100)
}

/** 건물종류별 헤드 ÷ 당월 확정+예정 헤드 전체, 상위 limit개 */
export function buildBuildingTypeHeadRatioItems(
  rows,
  { toNumber, getNormalizedCompanyType, formatPercent, toneClasses = [], limit = 4 },
) {
  const total = sumHeadCount(rows, toNumber)
  if (!total) return []

  const headsByType = new Map()
  for (const row of rows ?? []) {
    const type = getNormalizedCompanyType(row)
    if (!type) continue
    headsByType.set(type, (headsByType.get(type) ?? 0) + toNumber(row?.total_head_count))
  }

  return [...headsByType.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .slice(0, limit)
    .map(([label, heads], index) => ({
      label,
      ratioText: formatPercent(Math.round((heads / total) * 100)),
      tone: toneClasses[index % toneClasses.length],
    }))
}
