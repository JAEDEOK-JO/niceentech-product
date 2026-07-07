import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'

export type FirebaseClientConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  messagingSenderId: string
  appId: string
}

export const getFirebaseClientConfig = (): FirebaseClientConfig | null => {
  const config: FirebaseClientConfig = {
    apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY ?? '').trim(),
    authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
    projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
    messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '').trim(),
    appId: String(import.meta.env.VITE_FIREBASE_APP_ID ?? '').trim(),
  }

  if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) {
    return null
  }

  return config
}

export const getFirebaseVapidKey = () => String(import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '').trim()

export const isFirebaseConfigured = () => Boolean(getFirebaseClientConfig() && getFirebaseVapidKey())

export const getFirebaseApp = (): FirebaseApp | null => {
  const config = getFirebaseClientConfig()
  if (!config) return null

  if (getApps().length > 0) {
    return getApps()[0] ?? null
  }

  return initializeApp(config)
}
