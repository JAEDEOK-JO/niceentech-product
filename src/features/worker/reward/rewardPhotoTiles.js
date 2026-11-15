export const REWARD_VISIBLE_TILES = 3

export function buildRewardPhotoTiles(normalUrls = [], problemUrls = [], visible = REWARD_VISIBLE_TILES) {
  const normals = normalUrls.filter(Boolean).map((url) => ({ url, label: '정상' }))
  const problems = problemUrls.filter(Boolean).map((url) => ({ url, label: '문제' }))
  const all = [...normals, ...problems].map((photo, index) => ({ ...photo, index }))

  const normalCount = Math.min(normals.length, Math.max(1, visible - problems.length))
  const problemCount = Math.min(problems.length, visible - normalCount)
  const tiles = [...all.slice(0, normalCount), ...all.slice(normals.length, normals.length + problemCount)]

  return { all, tiles, hidden: all.length - tiles.length }
}
