export function orderedNoticeWorkers(workers, checkedIds) {
  const checked = new Set(checkedIds ?? [])
  const confirmed = []
  const waiting = []
  for (const worker of workers ?? []) {
    if (checked.has(worker.id)) confirmed.push(worker)
    else waiting.push(worker)
  }
  return [...confirmed, ...waiting]
}

export function noticeCheckCount(workers, checkedIds) {
  const checked = new Set(checkedIds ?? [])
  const confirmed = (workers ?? []).filter((worker) => checked.has(worker.id)).length
  return `${confirmed}/${(workers ?? []).length}`
}
