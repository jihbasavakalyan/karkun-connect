/**
 * KC-0058.6 — Dashboard state consistency investigation probe.
 * Evidence only. Do not use for product behavior.
 *
 * window.__KC0058_6__ → structured report
 * console: KC-0058.6.DASHSTATE-0N
 */

import { getCampaignConnectionMetrics } from '@/services/metricsService'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getPeopleStatistics } from '@/lib/peopleStore'
import { isRepositoryHydrationReady } from '@/repositories/hydrationReady'
import { isBackgroundHydrationReady } from '@/repositories/backgroundHydrationReady'

export type DashStateEvent = {
  id: string
  at: string
  performanceNow: number
  detail: Record<string, unknown>
}

type DashStateReport = {
  ticket: 'KC-0058.6'
  events: DashStateEvent[]
  metricsHistory: Array<{
    at: string
    connected: number
    remaining: number
    total: number
    source: string
    assignmentCount: number
    registryUnassigned: number
  }>
  storeResets: Array<{
    at: string
    functionName: string
    file: string
    reason: string
    previous: Record<string, unknown>
    next: Record<string, unknown>
    stack: string
  }>
  refreshTriggers: Array<{
    at: string
    reason: string
    detail: Record<string, unknown>
  }>
  firstGoodMetrics: DashStateReport['metricsHistory'][number] | null
  firstRegression: {
    from: DashStateReport['metricsHistory'][number]
    to: DashStateReport['metricsHistory'][number]
    interveningEvents: string[]
  } | null
}

declare global {
  interface Window {
    __KC0058_6__?: DashStateReport
  }
}

const MAX_EVENTS = 200

function ensureReport(): DashStateReport {
  if (typeof window === 'undefined') {
    return {
      ticket: 'KC-0058.6',
      events: [],
      metricsHistory: [],
      storeResets: [],
      refreshTriggers: [],
      firstGoodMetrics: null,
      firstRegression: null,
    }
  }
  if (!window.__KC0058_6__) {
    window.__KC0058_6__ = {
      ticket: 'KC-0058.6',
      events: [],
      metricsHistory: [],
      storeResets: [],
      refreshTriggers: [],
      firstGoodMetrics: null,
      firstRegression: null,
    }
  }
  return window.__KC0058_6__
}

function pushEvent(id: string, detail: Record<string, unknown>): void {
  const report = ensureReport()
  const event: DashStateEvent = {
    id,
    at: new Date().toISOString(),
    performanceNow: typeof performance !== 'undefined' ? performance.now() : 0,
    detail,
  }
  report.events.push(event)
  if (report.events.length > MAX_EVENTS) {
    report.events.splice(0, report.events.length - MAX_EVENTS)
  }
  console.info(`KC-0058.6.${id}`, detail)
}

function captureStack(): string {
  try {
    return (new Error('KC-0058.6 stack')).stack ?? '(no stack)'
  } catch {
    return '(stack unavailable)'
  }
}

function snapshotMetrics(source: string) {
  const metrics = getCampaignConnectionMetrics()
  const people = getPeopleStatistics()
  return {
    at: new Date().toISOString(),
    connected: metrics.connected,
    remaining: metrics.remaining,
    total: metrics.total,
    progressPct: metrics.progressPct,
    source,
    assignmentCount: getAllAssignments().length,
    registryUnassigned: people.unassignedKarkuns,
    hydrationReady: isRepositoryHydrationReady(),
    backgroundReady: isBackgroundHydrationReady(),
  }
}

function noteRegressionIfAny(
  report: DashStateReport,
  entry: DashStateReport['metricsHistory'][number],
): void {
  if (!report.firstGoodMetrics && entry.connected > 0 && entry.total > 0) {
    report.firstGoodMetrics = entry
    return
  }
  if (
    report.firstGoodMetrics &&
    !report.firstRegression &&
    report.firstGoodMetrics.connected > 0 &&
    (entry.connected === 0 || entry.total === 0 || entry.remaining === 0 && entry.connected === 0)
  ) {
    const goodAt = report.firstGoodMetrics.at
    const intervening = report.events
      .filter((e) => e.at >= goodAt && e.at <= entry.at)
      .map((e) => e.id)
    report.firstRegression = {
      from: report.firstGoodMetrics,
      to: entry,
      interveningEvents: intervening,
    }
    console.warn('KC-0058.6.REGRESSION', report.firstRegression)
  }
}

/** DASHSTATE-01 — metrics received / computed for dashboard. */
export function dashState01MetricsReceived(source: string): void {
  const report = ensureReport()
  const entry = snapshotMetrics(source)
  report.metricsHistory.push(entry)
  if (report.metricsHistory.length > MAX_EVENTS) {
    report.metricsHistory.splice(0, report.metricsHistory.length - MAX_EVENTS)
  }
  noteRegressionIfAny(report, entry)
  pushEvent('DASHSTATE-01', {
    connected: entry.connected,
    remaining: entry.remaining,
    total: entry.total,
    source: entry.source,
    assignmentCount: entry.assignmentCount,
    registryUnassigned: entry.registryUnassigned,
    hydrationReady: entry.hydrationReady,
    backgroundReady: entry.backgroundReady,
  })
}

/** DASHSTATE-02 — dashboard-facing store update (previous → new). */
export function dashState02StoreUpdated(
  label: string,
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): void {
  pushEvent('DASHSTATE-02', { label, previous, next })
}

/**
 * DASHSTATE-03 — widget render.
 * widget: CampaignProgress | Connections | Visits | Pending | FollowUps | Development | InterventionQueue
 */
export function dashState03WidgetRender(
  widget: string,
  state: 'loading' | 'ready' | 'empty' | 'error',
  values: Record<string, unknown>,
): void {
  pushEvent('DASHSTATE-03', { widget, state, values })
}

/** DASHSTATE-04 — store reset / clear / replace that may wipe valid data. */
export function dashState04StoreReset(input: {
  functionName: string
  file: string
  reason: string
  previous: Record<string, unknown>
  next: Record<string, unknown>
}): void {
  const report = ensureReport()
  const stack = captureStack()
  const entry = {
    at: new Date().toISOString(),
    ...input,
    stack,
  }
  report.storeResets.push(entry)
  if (report.storeResets.length > 50) {
    report.storeResets.splice(0, report.storeResets.length - 50)
  }
  pushEvent('DASHSTATE-04', {
    function: input.functionName,
    file: input.file,
    reason: input.reason,
    previous: input.previous,
    next: input.next,
    stack,
  })
}

/** DASHSTATE-05 — why a dashboard refresh / rebuild was triggered. */
export function dashState05RefreshTrigger(
  reason: string,
  detail: Record<string, unknown> = {},
): void {
  const report = ensureReport()
  const entry = {
    at: new Date().toISOString(),
    reason,
    detail,
  }
  report.refreshTriggers.push(entry)
  if (report.refreshTriggers.length > 50) {
    report.refreshTriggers.splice(0, report.refreshTriggers.length - 50)
  }
  pushEvent('DASHSTATE-05', { reason, ...detail })
}
