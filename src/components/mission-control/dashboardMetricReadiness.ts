/**
 * KC-0058.7 — Shared readiness contract for dashboard metric cards.
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
