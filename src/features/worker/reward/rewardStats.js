export function rewardStats(items) {
  const stats = { total: items.length, approved: 0, pending: 0, rejected: 0, amount: 0 }
  for (const item of items) {
    if (item.status === '승인') {
      stats.approved += 1
      stats.amount += Number(item.amount || 0)
    } else if (item.status === '반려') {
      stats.rejected += 1
    } else {
      stats.pending += 1
    }
  }
  return stats
}
