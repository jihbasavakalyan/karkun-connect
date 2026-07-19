/**
 * KC-0058.7 — Lightweight health KPI card that respects the shared readiness contract.
 */

import { Link } from 'react-router-dom'
import type { AdminHealthKpi } from '@/lib/missionControl/adminMissionControlPresentation'
import { resolveAdminHealthKpiPending } from './dashboardMetricReadiness'

const HEALTH_TONE: Record<AdminHealthKpi['tone'], string> = {
  green: 'mc-kpi-tone-green',
  amber: 'mc-kpi-tone-amber',
  red: 'mc-kpi-tone-red',
  neutral: 'mc-kpi-tone-neutral',
}

type AdminHealthKpiCardProps = {
  kpi: AdminHealthKpi
  metricsReady: boolean
  backgroundReady: boolean
}

export function AdminHealthKpiCard({
  kpi,
  metricsReady,
  backgroundReady,
}: AdminHealthKpiCardProps) {
  const pending = resolveAdminHealthKpiPending(kpi.id, metricsReady, backgroundReady)
  const tone = pending ? HEALTH_TONE.neutral : HEALTH_TONE[kpi.tone]
  const body = (
    <>
      <span className="acc-health-label">{kpi.label}</span>
      <span className={`acc-health-value ${tone}`} aria-busy={pending || undefined}>
        {pending ? '…' : kpi.value}
      </span>
      <span className="acc-health-hint">{pending ? 'Loading' : (kpi.hint ?? '\u00a0')}</span>
    </>
  )

  return (
    <li className={`acc-health-card ${tone}`}>
      {kpi.route && !pending ? (
        <Link to={kpi.route} className="acc-health-link">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  )
}
