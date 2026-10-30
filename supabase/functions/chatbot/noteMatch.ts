export function bigrams(texts: string[]) {
  const grams = new Set<string>()
  for (const text of texts) {
    const compact = String(text ?? '').toLowerCase().replace(/\s+/g, '')
    for (let index = 0; index < compact.length - 1; index += 1) grams.add(compact.slice(index, index + 2))
  }
  return grams
}

export function matchScore(query: Set<string>, terms: string[]) {
  let score = 0
  for (const gram of bigrams(terms)) {
    if (query.has(gram)) score += 1
  }
  return score
}
