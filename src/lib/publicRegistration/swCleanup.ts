const CLEARED_FLAG = 'kc.publicReg.swCleared'

/**
 * Public registration must not keep a Karkun Connect PWA cache.
 * A waiting service worker on registration.jihbasavakalyan.org can keep serving
 * an older payment UI because that host never mounts the app update prompt.
 */
export async function clearPublicRegistrationServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  try {
    if (window.sessionStorage.getItem(CLEARED_FLAG) === '1') return
  } catch {
    // private mode
  }

  const registrations = await navigator.serviceWorker.getRegistrations()
  const hadController = Boolean(navigator.serviceWorker.controller)
  await Promise.all(registrations.map((registration) => registration.unregister()))
  if (window.caches?.keys) {
    const keys = await window.caches.keys()
    await Promise.all(keys.map((key) => window.caches.delete(key)))
  }

  if (hadController || registrations.length > 0) {
    try {
      window.sessionStorage.setItem(CLEARED_FLAG, '1')
      window.location.reload()
    } catch {
      // private mode: workers are unregistered; the next navigation is network-first
    }
  }
}
