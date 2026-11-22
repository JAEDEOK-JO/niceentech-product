const PUBLIC_ATTENDANCE_ORIGIN = 'https://niceentech-product.vercel.app'

const isPhoneReachableOrigin = (origin) => {
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:') return false
    const host = url.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false
    return true
  } catch {
    return false
  }
}

export const attendanceGuestOrigin = () => {
  if (typeof window !== 'undefined' && isPhoneReachableOrigin(window.location.origin)) {
    return window.location.origin
  }
  return PUBLIC_ATTENDANCE_ORIGIN
}

export const workerSiteUrl = () => `${attendanceGuestOrigin()}/worker/`
