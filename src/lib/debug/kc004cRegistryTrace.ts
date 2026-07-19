/**
 * KC-004C — temporary investigation logging for registry size growth.
 * Remove after the duplicate insertion point is fixed / KC-004D certified.
 *
 * Intentionally does not import MOCK_KARKUN_REGISTRY (avoids provider init cycles).
 */

export type Kc004cRegistryTraceDetail = {
  caller: string
  phase?: string
  before?: number
  afterClear?: number
  firestoreCount?: number
  after?: number
  migrationVersion?: number | null
  path?: string
  extra?: Record<string, unknown>
}

export function kc004cTraceRegistry(detail: Kc004cRegistryTraceDetail): void {
  const payload = {
    t: typeof performance !== 'undefined' ? Math.round(performance.now()) : Date.now(),
    ...detail,
  }
  console.warn('[KC-004C]', payload)

  try {
    if (typeof window !== 'undefined') {
      const bucket = (window.__KC004C_REGISTRY_TRACE__ ??= [])
      bucket.push(payload)
    }
  } catch {
    // non-browser
  }
}

declare global {
  interface Window {
    __KC004C_REGISTRY_TRACE__?: Array<Record<string, unknown>>
  }
}
