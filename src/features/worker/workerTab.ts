export type WorkerTab = 'notice' | 'attendance' | 'reward' | 'profile'

const workerTabs: WorkerTab[] = ['notice', 'attendance', 'reward', 'profile']

export function workerTabFromQuery(value: unknown): WorkerTab {
  const tab = Array.isArray(value) ? value[0] : value
  return workerTabs.find((item) => item === tab) ?? 'notice'
}
