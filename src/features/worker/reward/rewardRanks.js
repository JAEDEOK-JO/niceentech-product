export function rewardRanks(items, limit = 5) {
  const counts = new Map()
  for (const item of items) {
    if (item.status !== '승인') continue
    const current = counts.get(item.user_id) || { userId: item.user_id, name: '', department: '', count: 0 }
    current.count += 1
    if (item.name) current.name = item.name
    if (item.department) current.department = item.department
    counts.set(item.user_id, current)
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))
    .slice(0, limit)
}
