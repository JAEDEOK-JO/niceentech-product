const countValue = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return number
}

const formatCount = (value, { blankZero = false } = {}) => {
  if (!Number.isFinite(value)) return ''
  if (blankZero && value === 0) return ''
  return Number.isInteger(value) ? String(value) : String(value)
}

export const planPieceCounts = (row) => {
  const head = countValue(row?.head)
  const hole = countValue(row?.hole)
  const groove = countValue(row?.groove)
  return {
    head,
    hole,
    groove,
    headText: formatCount(head, { blankZero: true }),
    holeText: formatCount(hole, { blankZero: true }),
    grooveText: formatCount(groove, { blankZero: true }),
  }
}

export const sumPlanPieceCounts = (rows) => {
  const totals = (rows ?? []).reduce(
    (acc, row) => {
      acc.head += countValue(row?.head)
      acc.hole += countValue(row?.hole)
      acc.groove += countValue(row?.groove)
      return acc
    },
    { head: 0, hole: 0, groove: 0 },
  )
  return {
    headText: formatCount(totals.head),
    holeText: formatCount(totals.hole),
    grooveText: formatCount(totals.groove),
  }
}
