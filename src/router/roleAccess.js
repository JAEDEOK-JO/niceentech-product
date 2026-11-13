import { isWorkerRole } from '@/utils/adminAccess'
import { isWorkerStandalone } from '@/features/worker/pwa/workerDisplayMode'

export const isWorkerAppRoute = (to) =>
  to.name === 'worker' || to.path === '/worker' || to.path.startsWith('/worker/')

export const isPublicAttendanceRoute = (to) =>
  to.name === 'attendance-guest' || to.path.startsWith('/attendance/guest')

export function redirectForSessionRole(role, to) {
  if (isWorkerRole(role)) {
    return isWorkerAppRoute(to) ? null : { name: 'worker' }
  }
  if (isWorkerAppRoute(to) && isWorkerStandalone()) {
    return { name: 'main' }
  }
  return null
}
