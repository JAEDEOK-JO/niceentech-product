export function rewardRanks(items) {
  const counts = new Map()
  for (const item of items) {
    if (item.status !== '승인') continue
    const current = counts.get(item.user_id) || { userId: item.user_id, name: item.name || '', count: 0 }
    current.count += 1
    if (item.name) current.name = item.name
    counts.set(item.user_id, current)
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))
    .slice(0, 10)
}
