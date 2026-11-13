import { listenForWorkerInstall, promptWorkerInstall, workerCanInstall } from './workerInstallPrompt'

listenForWorkerInstall()

export function useWorkerInstall() {
  return {
    canInstall: workerCanInstall,
    install: promptWorkerInstall,
  }
}
