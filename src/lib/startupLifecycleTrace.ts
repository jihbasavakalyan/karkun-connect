/**
 * KC-027G — Authenticated startup lifecycle tracer.
 * Records ordered events from login → stable dashboard for audit/measurement.
 */

export type StartupLifecycleEvent = {
  seq: number
  t: number
  deltaMs: number
  label: string
  detail?: Record<string, unknown>
}

const events: StartupLifecycleEvent[] = []
let seq = 0
let t0 = 0
let lastT = 0
let enabled = true

export function resetStartupLifecycleTrace(): void {
  events.length = 0
  seq = 0
  t0 = 0
  lastT = 0
}

export function setStartupLifecycleTraceEnabled(value: boolean): void {
  enabled = value
}

export function markStartupLifecycle(
  label: string,
  detail?: Record<string, unknown>,
): void {
  if (!enabled) return
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (t0 === 0) {
    t0 = now
    lastT = now
  }
  const event: StartupLifecycleEvent = {
    seq: ++seq,
    t: Math.round(now - t0),
    deltaMs: Math.round(now - lastT),
    label,
    detail,
  }
  lastT = now
  events.push(event)

  if (import.meta.env.DEV) {
    console.info('[KC-027G]', event.t, `+${event.deltaMs}`, label, detail ?? {})
  }

  try {
    if (typeof window !== 'undefined') {
      window.__KC027G_LIFECYCLE__ = getStartupLifecycleTrace()
    }
  } catch {
    // non-browser
  }
}

export function getStartupLifecycleTrace(): StartupLifecycleEvent[] {
  return [...events]
}

export function summarizeStartupLifecycle(): {
  events: StartupLifecycleEvent[]
  hydrateCycles: number
  storeNotifies: number
  snapshotListenerFires: number
  commandCenterBuilds: number
  dashboardGates: number
} {
  const labels = events.map((e) => e.label)
  return {
    events: getStartupLifecycleTrace(),
    hydrateCycles: labels.filter((l) => l.includes('hydrate.cycle')).length,
    storeNotifies: labels.filter((l) => l.startsWith('store.notify')).length,
    snapshotListenerFires: labels.filter((l) => l === 'firestore.snapshot.listener.fired')
      .length,
    commandCenterBuilds: labels.filter((l) => l.includes('commandCenter.snapshot.build'))
      .length,
    dashboardGates: labels.filter((l) => l === 'ProtectedRoute.canRender').length,
  }
}

declare global {
  interface Window {
    __KC027G_LIFECYCLE__?: StartupLifecycleEvent[]
  }
}
