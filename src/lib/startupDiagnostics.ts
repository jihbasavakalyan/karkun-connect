/**
 * KC-027A — Temporary startup timing / rejection diagnostics.
 */

type TimingMark = {
  label: string
  at: number
  detail?: Record<string, unknown>
}

const marks: TimingMark[] = []
let rejectionHookInstalled = false

export function logStartupTiming(label: string, detail?: Record<string, unknown>): void {
  const mark: TimingMark = {
    label,
    at: Date.now(),
    detail,
  }
  marks.push(mark)
  // KC-027F: keep marks in memory for diagnostics; never console.spam production.
  if (import.meta.env.DEV) {
    console.info('[KC-027A][timing]', label, detail ?? {})
  }
}

export function getStartupTimingMarks(): TimingMark[] {
  return [...marks]
}

export function installStartupRejectionLogging(): void {
  if (typeof window === 'undefined' || rejectionHookInstalled) {
    return
  }
  rejectionHookInstalled = true
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[KC-027A][unhandledrejection]', {
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
      route: `${window.location.pathname}${window.location.search}`,
    })
  })
}
