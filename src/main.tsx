import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installStartupRejectionLogging, logStartupTiming } from '@/lib/startupDiagnostics'

async function runDeferredBootstrap(): Promise<void> {
  logStartupTiming('bootstrap.start')
  const { initializeRepositories } = await import('@/repositories/firestore/initialize')
  const {
    markRepositoryHydrationFailed,
    markRepositoryHydrationReady,
    isRepositoryHydrationReady,
    isRepositoryHydrationFailed,
  } = await import('@/repositories/hydrationReady')
  try {
    logStartupTiming('initializeRepositories.start')
    await initializeRepositories()
    logStartupTiming('initializeRepositories.success')
    // Local provider marks ready inside initializeRepositories; firestore path
    // marks ready only after critical hydrate succeeds.
    if (!isRepositoryHydrationReady() && !isRepositoryHydrationFailed()) {
      markRepositoryHydrationReady()
    }
  } catch (error) {
    console.error('[bootstrap] repository initialization failed', error)
    logStartupTiming('initializeRepositories.failed', {
      message: error instanceof Error ? error.message : String(error),
    })
    // KC-0058.3 — never mark ready after critical failure (invalid 0/0/0% state).
    if (!isRepositoryHydrationFailed()) {
      markRepositoryHydrationFailed(error)
    }
  }

  // KC-004D: migration runs after successful hydrationReady only.
  if (!isRepositoryHydrationReady()) {
    logStartupTiming('productionMigration.skipped', { reason: 'hydration_not_ready' })
  } else {
    const { runProductionDataMigration } = await import('@/services/productionDataMigrationService')
    try {
      await runProductionDataMigration()
      logStartupTiming('productionMigration.invoked')
    } catch (error) {
      console.error('[bootstrap] production migration failed', error)
      logStartupTiming('productionMigration.failed', {
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // KC-027F: Digital Rafeeq runtime must not compete with first dashboard paint.
  // Schedule after hydrate gate; do not await on the bootstrap critical path.
  const scheduleRafeeq =
    typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2000 })
      : (cb: () => void) => window.setTimeout(cb, 0)

  scheduleRafeeq(() => {
    void (async () => {
      try {
        const { initializeRuntime } = await import('@/runtime/bootstrap/initializeRuntime')
        const runtimeResult = await initializeRuntime()
        logStartupTiming('digitalRafeeqRuntime.complete', { status: runtimeResult.status })
        if (runtimeResult.status === 'Failed') {
          console.warn('[bootstrap] Digital Rafeeq runtime failed', runtimeResult.errorMessage)
        } else if (import.meta.env.DEV && runtimeResult.status === 'Degraded') {
          console.info('[bootstrap] Digital Rafeeq runtime degraded', runtimeResult.errorMessage)
        }
      } catch (error) {
        console.warn('[bootstrap] Digital Rafeeq runtime initialization error', error)
        logStartupTiming('digitalRafeeqRuntime.error')
      }
    })()
  })
}

function publishBuildStamp(): void {
  try {
    if (typeof window === 'undefined') return
    const stamp = {
      sha: typeof __KC_BUILD_SHA__ !== 'undefined' ? __KC_BUILD_SHA__ : 'unknown',
      time: typeof __KC_BUILD_TIME__ !== 'undefined' ? __KC_BUILD_TIME__ : 'unknown',
    }
    ;(window as Window & { __KC_BUILD__?: typeof stamp }).__KC_BUILD__ = stamp
  } catch {
    // ignore
  }
}

function bootstrap(): void {
  installStartupRejectionLogging()
  publishBuildStamp()
  logStartupTiming('react.mount.start')

  const root = document.getElementById('root')
  if (!root) {
    throw new Error('Root element not found')
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  logStartupTiming('react.mount.complete')

  void runDeferredBootstrap()
}

bootstrap()
