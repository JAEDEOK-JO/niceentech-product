const GUEST_LINK_SECRET = 'niceentech-attendance-guest-v1'
export const GUEST_LINK_TTL_MS = 10 * 60 * 1000
const PUBLIC_ATTENDANCE_ORIGIN = 'https://niceentech-product.vercel.app'

export type GuestLink = {
  token: string
  url: string
  userId: string
  expiresAt: number
}

const textEncoder = new TextEncoder()

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const base64UrlToBytes = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

const hmacKey = async () =>
  crypto.subtle.importKey('raw', textEncoder.encode(GUEST_LINK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

const signBody = async (body: string) => {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(), textEncoder.encode(body))
  return bytesToBase64Url(new Uint8Array(signature))
}

const isPhoneReachableOrigin = (origin: string) => {
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

export const attendanceGuestUrl = (token: string) =>
  `${attendanceGuestOrigin()}/attendance/guest/${encodeURIComponent(token)}`

export async function createGuestLink(userId: string, now = Date.now()): Promise<GuestLink> {
  const ownerId = String(userId ?? '').trim()
  if (!ownerId) throw new Error('로그인 정보가 없습니다.')
  const expiresAt = now + GUEST_LINK_TTL_MS
  const body = bytesToBase64Url(textEncoder.encode(JSON.stringify({
    id: crypto.randomUUID(),
    exp: expiresAt,
    uid: ownerId,
  })))
  const token = `${body}.${await signBody(body)}`
  return { token, url: attendanceGuestUrl(token), userId: ownerId, expiresAt }
}

export async function readGuestLink(token: string, now = Date.now()): Promise<GuestLink | null> {
  const [body, signature, extra] = String(token ?? '').split('.')
  if (!body || !signature || extra) return null
  const expected = await signBody(body)
  if (expected.length !== signature.length) return null
  let mismatch = 0
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index)
  }
  if (mismatch !== 0) return null

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as {
      id?: string
      exp?: number
      uid?: string
    }
    const expiresAt = Number(payload.exp)
    const userId = String(payload.uid ?? '').trim()
    if (!payload.id || !userId || !Number.isFinite(expiresAt) || expiresAt <= now) return null
    const nextToken = `${body}.${signature}`
    return { token: nextToken, url: attendanceGuestUrl(nextToken), userId, expiresAt }
  } catch {
    return null
  }
}
