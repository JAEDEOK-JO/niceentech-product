export const collectPlanMemoLabels = (planRow, { includeInitialOnly = false } = {}) => {
  const area = String(planRow?.area ?? '').trim()
  const initial = String(planRow?.initial ?? '').trim()
  const name = String(planRow?.name ?? '').trim()
  const labels = []
  if (area) labels.push(area)
  if (initial && name) labels.push(`${initial} ${name}`)
  if (includeInitialOnly && initial) labels.push(initial)
  return [...new Set(labels)]
}

export const resolvePlanMemoLabels = ({
  planRow = null,
  memoLabel = '',
  memoLabels = [],
  includeInitialOnly = false,
} = {}) => {
  const labels = [
    ...memoLabels,
    memoLabel,
    ...collectPlanMemoLabels(planRow, { includeInitialOnly }),
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
  return [...new Set(labels)]
}

export const memoMatchesPlanLabels = (memo, labels) => {
  const text = String(memo ?? '').trim()
  if (!text) return false
  return (labels ?? []).some((label) => {
    const key = String(label ?? '').trim()
    if (!key) return false
    return text === key || text.startsWith(`${key} `)
  })
}
