import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installStartupRejectionLogging, logStartupTiming } from '@/lib/startupDiagnostics'

async function runDeferredBootstrap(): Promise<void> {
  logStartupTiming('bootstrap.start')
  const { initializeRepositories } = await import('@/repositories/firestore/initialize')
  const { markRepositoryHydrationReady } = await import('@/repositories/hydrationReady')
  try {
    logStartupTiming('initializeRepositories.start')
    await initializeRepositories()
    logStartupTiming('initializeRepositories.success')
  } catch (error) {
    console.error('[bootstrap] repository initialization failed', error)
    logStartupTiming('initializeRepositories.failed', {
      message: error instanceof Error ? error.message : String(error),
    })
  } finally {
    // Gate UI empty states until startup hydrate finishes (or local provider short-circuits).
    markRepositoryHydrationReady()
    logStartupTiming('hydrationReady.marked')
  }

  const { runProductionDataMigration } = await import('@/services/productionDataMigrationService')
  runProductionDataMigration()
  logStartupTiming('productionMigration.invoked')

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

function bootstrap(): void {
  installStartupRejectionLogging()
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
