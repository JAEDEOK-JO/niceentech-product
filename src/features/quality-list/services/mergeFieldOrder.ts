function trimmedValues(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function smallestNumber(value: string) {
  const numbers = value.match(/\d+/g)
  if (!numbers?.length) return Number.POSITIVE_INFINITY
  return Math.min(...numbers.map((number) => Number(number)))
}

export function joinSortedDrawingNos(values: string[]) {
  return trimmedValues(values)
    .sort((left, right) => {
      const byNumber = smallestNumber(left) - smallestNumber(right)
      if (byNumber !== 0) return byNumber
      return left.localeCompare(right, 'ko', { numeric: true })
    })
    .join(', ')
}

export function joinSortedAreas(values: string[]) {
  return trimmedValues(values)
    .sort((left, right) => left.localeCompare(right, 'ko', { numeric: true }))
    .join(', ')
}
