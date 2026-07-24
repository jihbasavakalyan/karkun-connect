/**
 * KC-0102B — Coalesce bursty store listener notifications into one callback.
 * Rendering orchestration only; does not change store publish APIs or data.
 */

export type CoalescedNotifierOptions = {
  /**
   * Trailing quiet window (ms) after the microtask batch.
   * Use a function to choose a wider window during startup hydrate storms.
   * `0` = flush at end of microtask only.
   */
  trailingMs?: number | (() => number)
}

export type CoalescedNotifier = {
  /** Schedule a coalesced notification. */
  bump: () => void
  /** Cancel pending work (e.g. effect cleanup). */
  dispose: () => void
  /** Test/diagnostics: how many bump() calls since create/reset. */
  getPendingBumpCount: () => number
  /** Test/diagnostics: how many notify() flushes since create. */
  getFlushCount: () => number
}

function resolveTrailingMs(trailingMs: CoalescedNotifierOptions['trailingMs']): number {
  if (typeof trailingMs === 'function') return Math.max(0, trailingMs())
  return Math.max(0, trailingMs ?? 0)
}

/**
 * Batches synchronous notification storms (and optional short trailing window)
 * so React state / snapshot invalidation runs once per logical transition.
 */
export function createCoalescedNotifier(
  notify: () => void,
  options: CoalescedNotifierOptions = {},
): CoalescedNotifier {
  let disposed = false
  let pending = false
  let microScheduled = false
  let trailingTimer: ReturnType<typeof setTimeout> | null = null
  let bumpCount = 0
  let flushCount = 0

  const clearTrailing = () => {
    if (trailingTimer != null) {
      clearTimeout(trailingTimer)
      trailingTimer = null
    }
  }

  const flush = () => {
    if (disposed || !pending) return
    pending = false
    flushCount += 1
    notify()
  }

  const scheduleTrailingOrFlush = () => {
    if (disposed) return
    const ms = resolveTrailingMs(options.trailingMs)
    clearTrailing()
    if (ms <= 0) {
      flush()
      return
    }
    trailingTimer = setTimeout(() => {
      trailingTimer = null
      flush()
    }, ms)
  }

  const bump = () => {
    if (disposed) return
    bumpCount += 1
    pending = true

    // Extending an in-flight trailing window when more bumps arrive.
    if (trailingTimer != null) {
      scheduleTrailingOrFlush()
      return
    }

    if (microScheduled) return
    microScheduled = true
    queueMicrotask(() => {
      microScheduled = false
      if (disposed) return
      scheduleTrailingOrFlush()
    })
  }

  const dispose = () => {
    disposed = true
    pending = false
    microScheduled = false
    clearTrailing()
  }

  return {
    bump,
    dispose,
    getPendingBumpCount: () => bumpCount,
    getFlushCount: () => flushCount,
  }
}
