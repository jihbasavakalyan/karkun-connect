/**
 * KC-0058.7 — Shared readiness contract for dashboard metric cards.
 * KC-0102A — Per-metric Campaign Health gates (Phase A readiness UX).
 *
 * Critical MetricsService-backed widgets must not render business values until
 * metricsReady. Background widgets continue to use backgroundReady.
 * The metric value itself never determines readiness.
 */

export type DashboardMetricReadinessGate = 'critical' | 'background' | 'immediate'

/** Campaign Health KPIs from buildAdminCampaignHealthKpis(). */
export const ADMIN_HEALTH_KPI_READINESS: Record<string, DashboardMetricReadinessGate> = {
  connections: 'critical', // MetricsService — same contract as Campaign Progress
  overall: 'background',
  'visits-done': 'background',
  'visits-pending': 'background',
  'follow-ups': 'background',
  development: 'background',
}

/**
 * Campaign Health panel metrics (buildCampaignOperationsHealthMetrics).
 * Visits planned/completed use critical connection assignments; module slices
 * wait on background hydrate (ijtema / baitul / compliance stores).
 */
export const CAMPAIGN_HEALTH_METRIC_READINESS: Record<
  string,
  DashboardMetricReadinessGate
> = {
  visits: 'critical',
  'weekly-ijtema': 'background',
  'monthly-baitul-maal': 'background',
  'app-registration': 'background',
}

export function resolveDashboardMetricPending(input: {
  gate: DashboardMetricReadinessGate
  metricsReady: boolean
  backgroundReady: boolean
}): boolean {
  if (input.gate === 'critical') {
    return !input.metricsReady
  }
  if (input.gate === 'background') {
    return !input.backgroundReady
  }
  return false
}

export function resolveAdminHealthKpiPending(
  kpiId: string,
  metricsReady: boolean,
  backgroundReady: boolean,
): boolean {
  const gate = ADMIN_HEALTH_KPI_READINESS[kpiId] ?? 'immediate'
  return resolveDashboardMetricPending({ gate, metricsReady, backgroundReady })
}

export function resolveCampaignHealthMetricPending(
  metricId: string,
  metricsReady: boolean,
  backgroundReady: boolean,
): boolean {
  const gate = CAMPAIGN_HEALTH_METRIC_READINESS[metricId] ?? 'background'
  return resolveDashboardMetricPending({ gate, metricsReady, backgroundReady })
}
