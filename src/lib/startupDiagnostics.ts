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
  if (import.meta.env.DEV) {
    console.info('[KC-027A][timing]', label, detail ?? {})
  }
  try {
    if (typeof window === 'undefined') return
    const w = window as Window & {
      __KC_STARTUP__?: { marks: TimingMark[]; firstContentMs?: number }
    }
    const origin = marks[0]?.at ?? mark.at
    w.__KC_STARTUP__ = {
      marks: [...marks],
      firstContentMs: mark.at - origin,
    }
  } catch {
    // ignore
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
