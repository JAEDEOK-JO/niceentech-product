const AUTH_STORAGE_KEY = 'niceentech-auth'

async function clearCacheStorage() {
  if (typeof window === 'undefined' || !window.caches?.keys) return

  const cacheKeys = await window.caches.keys()
  await Promise.all(cacheKeys.map((key) => window.caches.delete(key)))
}

function clearStoragePreservingLogin() {
  const authSession = window.localStorage.getItem(AUTH_STORAGE_KEY)

  window.localStorage.clear()
  window.sessionStorage.clear()

  if (authSession !== null) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, authSession)
  }
}

function reloadBrowserIgnoringAppCache() {
  const url = new URL(window.location.href)
  url.searchParams.set('_cache_refresh', Date.now().toString())
  window.location.replace(url.toString())
}

export async function clearCacheAndReload() {
  await clearCacheStorage()
  clearStoragePreservingLogin()

  if (typeof window.electronAPI?.clearCacheAndReload === 'function') {
    await window.electronAPI.clearCacheAndReload()
    return
  }

  reloadBrowserIgnoringAppCache()
}
