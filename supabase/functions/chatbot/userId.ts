const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function claims(token: string) {
  const part = token.split('.')[1] ?? ''
  if (!part) return null
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='))
    return JSON.parse(json) as { sub?: unknown; role?: unknown; exp?: unknown }
  } catch {
    return null
  }
}

export function userIdFromToken(token: string) {
  const value = claims(token.trim())
  if (!value || value.role !== 'authenticated') return ''
  const exp = Number(value.exp)
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return ''
  const id = String(value.sub ?? '')
  return USER_ID.test(id) ? id : ''
}
