const vapidKeyToBytes = (vapidKey: string) => {
  const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4)
  const base64 = `${vapidKey}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

const sameBytes = (left: ArrayBuffer, right: Uint8Array) => {
  const current = new Uint8Array(left)
  if (current.length !== right.length) return false
  return current.every((byte, index) => byte === right[index])
}

export async function replaceMismatchedPushSubscription(
  registration: ServiceWorkerRegistration,
  vapidKey: string,
) {
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const existingKey = subscription.options?.applicationServerKey
  if (existingKey && sameBytes(existingKey, vapidKeyToBytes(vapidKey))) return

  await subscription.unsubscribe()
}
