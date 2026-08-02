/**
 * KC-039A — Lightweight install / offline / update shell for the PWA.
 * No campaign, auth, or reporting logic.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'

const DISMISS_KEY = 'kc039.pwaInstallDismissedUntil'
const INSTALLED_KEY = 'kc039.pwaInstalled'
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const until = Number(raw)
    if (!Number.isFinite(until)) return false
    if (Date.now() < until) return true
    localStorage.removeItem(DISMISS_KEY)
    return false
  } catch {
    return false
  }
}

function isMarkedInstalled(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1'
  } catch {
    return false
  }
}

function markInstalledPermanently(): void {
  try {
    localStorage.setItem(INSTALLED_KEY, '1')
    localStorage.removeItem(DISMISS_KEY)
  } catch {
    // private mode
  }
}

function dismissForThirtyDays(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS))
  } catch {
    // private mode
  }
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia?.('(display-mode: standalone)')
  if (mq?.matches) return true
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

/** KC-039A — never interrupt Weekly Ijtema attendance workflows. */
function isAttendanceWorkflowPath(pathname: string): boolean {
  return (
    pathname.includes('/weekly-ijtema') ||
    pathname.includes('/weeklyIjtema') ||
    pathname.includes('/ijtema')
  )
}

export function PwaRuntimeChrome() {
  const location = useLocation()
  const suppressInstall = useMemo(
    () => isAttendanceWorkflowPath(location.pathname),
    [location.pathname],
  )

  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      window.setInterval(() => {
        void registration.update()
      }, 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (isStandaloneDisplay()) {
      markInstalledPermanently()
      setShowInstall(false)
    }
  }, [])

  useEffect(() => {
    const onInstalled = () => {
      markInstalledPermanently()
      setInstallEvent(null)
      setShowInstall(false)
    }
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  useEffect(() => {
    if (
      isStandaloneDisplay() ||
      isMarkedInstalled() ||
      isDismissed() ||
      suppressInstall
    ) {
      setShowInstall(false)
      return
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [suppressInstall])

  const onInstall = useCallback(async () => {
    if (!installEvent) return
    await installEvent.prompt()
    try {
      const choice = await installEvent.userChoice
      if (choice.outcome === 'accepted') {
        markInstalledPermanently()
      }
    } catch {
      // ignore
    }
    setInstallEvent(null)
    setShowInstall(false)
  }, [installEvent])

  const onLater = useCallback(() => {
    dismissForThirtyDays()
    setShowInstall(false)
    setInstallEvent(null)
  }, [])

  return (
    <>
      {!online ? (
        <div
          role="alert"
          className="fixed inset-x-0 bottom-0 z-[80] border-t border-border bg-surface px-4 py-3 shadow-card"
        >
          <div className="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-heading">You are offline.</p>
              <p className="text-xs text-secondary">Please reconnect to continue.</p>
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {showInstall && installEvent && online && !suppressInstall ? (
        <div
          role="dialog"
          aria-label="Install Karkun Connect"
          className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md rounded-xl border border-border bg-surface p-4 shadow-card sm:inset-x-auto sm:right-4 sm:bottom-4"
        >
          <p className="text-sm font-semibold text-text-heading">Install Karkun Connect</p>
          <p className="mt-1 text-xs text-secondary">
            Add Karkun Connect to your Home Screen for one-tap access.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-white"
              onClick={() => void onInstall()}
            >
              Install
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold text-text-heading"
              onClick={onLater}
            >
              Later
            </button>
          </div>
        </div>
      ) : null}

      {needRefresh ? (
        <div
          role="status"
          className="fixed inset-x-3 top-3 z-[75] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-primary/30 bg-surface px-4 py-3 shadow-card sm:inset-x-auto sm:right-4"
        >
          <p className="text-sm text-text-heading">
            A new version of Karkun Connect is available.
          </p>
          <button
            type="button"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-white"
            onClick={() => void updateServiceWorker(true)}
          >
            Refresh
          </button>
        </div>
      ) : null}
    </>
  )
}
