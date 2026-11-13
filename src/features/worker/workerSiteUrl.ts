import { attendanceGuestOrigin } from '@/features/attendance/guest/guestLink'

export const workerSiteUrl = () => `${attendanceGuestOrigin()}/worker`
