/**
 * KC-0098 — Single-action protection and request de-duplication.
 * Guarantees one user action → one in-flight operation (UI + shared keys).
 */

const DEFAULT_HOLD_MS = 350

/** Sync locks: absorb double-taps before React re-renders. */
const syncLocks = new Map<string, number>()

/** Async in-flight map: coalesce identical keys to one Promise. */
const asyncInFlight = new Map<string, Promise<unknown>>()

export type ActionProfileSample = {
  key: string
  phase: 'ack' | 'work' | 'settle' | 'total'
  ms: number
  at: number
}

const profileSamples: ActionProfileSample[] = []
const MAX_SAMPLES = 200

function recordSample(sample: ActionProfileSample): void {
  profileSamples.push(sample)
  if (profileSamples.length > MAX_SAMPLES) {
    profileSamples.splice(0, profileSamples.length - MAX_SAMPLES)
  }
  if (typeof console !== 'undefined' && typeof import.meta !== 'undefined') {
    try {
      if (import.meta.env?.DEV) {
        console.info('[KC-0098]', sample.phase, sample.key, `${sample.ms.toFixed(1)}ms`)
      }
    } catch {
      // ignore non-Vite environments
    }
  }
}

export function getActionProfileSamples(): readonly ActionProfileSample[] {
  return profileSamples
}

export function clearActionProfileSamples(): void {
  profileSamples.length = 0
}

export function summarizeActionProfile(): Record<
  string,
  { count: number; avgMs: number; maxMs: number }
> {
  const byKey: Record<string, number[]> = {}
  for (const sample of profileSamples) {
    if (sample.phase !== 'total') continue
    const bucket = byKey[sample.key] ?? (byKey[sample.key] = [])
    bucket.push(sample.ms)
  }
  const out: Record<string, { count: number; avgMs: number; maxMs: number }> = {}
  for (const [key, values] of Object.entries(byKey)) {
    const sum = values.reduce((a, b) => a + b, 0)
    out[key] = {
      count: values.length,
      avgMs: Math.round((sum / values.length) * 10) / 10,
      maxMs: Math.round(Math.max(...values) * 10) / 10,
    }
  }
  return out
}

/**
 * Try to begin a user action. Returns false if the same key is still locked
 * (duplicate click / rapid re-entry). Hold covers sync handlers that finish
 * before React can disable the control.
 */
export function tryBeginAction(key: string, holdMs = DEFAULT_HOLD_MS): boolean {
  const now = performance.now()
  const until = syncLocks.get(key)
  if (until !== undefined && until > now) {
    return false
  }
  syncLocks.set(key, now + holdMs)
  return true
}

export function endAction(key: string): void {
  syncLocks.delete(key)
}

export function isActionLocked(key: string): boolean {
  const until = syncLocks.get(key)
  return until !== undefined && until > performance.now()
}

/**
 * Coalesce concurrent async work for the same key onto one Promise.
 * Later callers receive the in-flight result instead of starting a duplicate.
 */
export function runExclusive<T>(key: string, work: () => Promise<T> | T): Promise<T> {
  const existing = asyncInFlight.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  const started = performance.now()
  const promise = Promise.resolve()
    .then(() => work())
    .then((result) => {
      recordSample({
        key,
        phase: 'total',
        ms: performance.now() - started,
        at: Date.now(),
      })
      return result
    })
    .finally(() => {
      if (asyncInFlight.get(key) === promise) {
        asyncInFlight.delete(key)
      }
    })

  asyncInFlight.set(key, promise)
  return promise
}

export function isExclusiveInFlight(key: string): boolean {
  return asyncInFlight.has(key)
}

/**
 * Keep the control in a busy/ack state long enough for the user to see feedback
 * and for a second physical tap to be ignored.
 */
export async function settleUiAction(options?: {
  minMs?: number
  waitForPendingWrites?: boolean
  key?: string
}): Promise<void> {
  const minMs = options?.minMs ?? DEFAULT_HOLD_MS
  const started = performance.now()
  await Promise.resolve()

  if (options?.waitForPendingWrites) {
    try {
      const { getPendingWriteCount } = await import('@/repositories/firestore/offlineSync')
      const drainStarted = Date.now()
      // Allow sync queueWrite() to bump the counter first.
      await Promise.resolve()
      while (getPendingWriteCount() > 0 && Date.now() - drainStarted < 8_000) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 40)
        })
      }
    } catch {
      // offlineSync may be unavailable in non-browser profile scripts
    }
  }

  const elapsed = performance.now() - started
  if (elapsed < minMs) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, minMs - elapsed)
    })
  }

  recordSample({
    key: options?.key ?? 'settleUiAction',
    phase: 'settle',
    ms: performance.now() - started,
    at: Date.now(),
  })
}

export function markActionAck(key: string, startedAt: number): void {
  recordSample({
    key,
    phase: 'ack',
    ms: performance.now() - startedAt,
    at: Date.now(),
  })
}
