export const MAKER_PRESETS = [
  { name: '현대', badge: '현', badgeClass: 'text-blue-600' },
  { name: '세아', badge: '세', badgeClass: 'text-emerald-600' },
  { name: '휴스틸', badge: '휴', badgeClass: 'text-orange-500' },
  { name: '금강', badge: '금', badgeClass: 'text-amber-500' },
]

const PRESET_NAMES = MAKER_PRESETS.map((item) => item.name)
const EXTRA_TEXT_CLASSES = ['text-violet-600', 'text-rose-600', 'text-cyan-700', 'text-fuchsia-600', 'text-sky-700']

export function sortMakerNames(names) {
  const unique = []
  const seen = new Set()
  for (const name of names ?? []) {
    const trimmed = String(name ?? '').trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    unique.push(trimmed)
  }
  const presets = PRESET_NAMES.filter((name) => seen.has(name))
  const extras = unique.filter((name) => !PRESET_NAMES.includes(name))
  return [...presets, ...extras]
}

export function makerTextClass(name) {
  const preset = MAKER_PRESETS.find((item) => item.name === name)
  if (preset) return preset.badgeClass
  const index = [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % EXTRA_TEXT_CLASSES.length
  return EXTRA_TEXT_CLASSES[index]
}

export function makerShortLabel(name) {
  const preset = MAKER_PRESETS.find((item) => item.name === name)
  if (preset) return preset.badge
  return [...String(name)][0] ?? ''
}

export function parseMaker(value) {
  if (!value) return { presets: [] }
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    const raw = Array.isArray(parsed?.presets) ? parsed.presets : []
    return { presets: sortMakerNames(raw) }
  } catch {
    return { presets: [] }
  }
}

export function serializeMaker({ presets }) {
  const nextPresets = sortMakerNames(presets)
  if (nextPresets.length === 0) return null
  return JSON.stringify({ presets: nextPresets })
}

export function makerDisplayItems(value) {
  const { presets } = parseMaker(value)
  const useFullName = presets.length <= 2
  return presets.map((name) => ({
    key: name,
    label: useFullName ? name : makerShortLabel(name),
    badgeClass: makerTextClass(name),
  }))
}
