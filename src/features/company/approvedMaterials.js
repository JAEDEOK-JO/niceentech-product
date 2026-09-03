const splitPattern = /[\s,./|]+/

export const normalizeApprovedMaterialName = (value) => String(value ?? '').trim().replace(/\s+/g, ' ')

const nameKey = (value) => normalizeApprovedMaterialName(value).toLocaleLowerCase('ko')

export const uniqueApprovedMaterialNames = (names) => {
  const seen = new Set()
  const result = []
  for (const item of names ?? []) {
    const normalized = normalizeApprovedMaterialName(item)
    if (!normalized) continue
    const key = nameKey(normalized)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }
  return result
}

export const parseApprovedMaterialNames = (value) => {
  if (Array.isArray(value)) return uniqueApprovedMaterialNames(value)
  const text = String(value ?? '').trim()
  if (!text) return []
  return uniqueApprovedMaterialNames(text.split(splitPattern))
}

export const formatApprovedMaterialsLabel = (names) => uniqueApprovedMaterialNames(names).join(' ')

export const matchesApprovedMaterial = (names, query) => {
  const keyword = nameKey(query)
  if (!keyword) return true
  return uniqueApprovedMaterialNames(names).some((name) => nameKey(name).includes(keyword))
}
