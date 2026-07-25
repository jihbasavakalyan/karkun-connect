/**
 * KC-0109 — Campaign Health panel (percentages only).
 * KC-0102A — Per-metric readiness: critical slices unlock at metricsReady;
 * background slices wait on backgroundReady without blanking the whole panel.
 * KC-0106 — Derived executive summary; module links launch Operations (no editing).
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { CampaignHealthMetric } from '@/lib/missionControl/campaignOperationsCommandCenter'
import { resolveCampaignHealthMetricPending } from './dashboardMetricReadiness'

const PLACEHOLDER_METRICS: Array<Pick<CampaignHealthMetric, 'id' | 'label'>> = [
  { id: 'visits', label: 'Visits' },
  { id: 'weekly-ijtema', label: 'Weekly Ijtema' },
  { id: 'monthly-baitul-maal', label: 'Monthly Baitul Maal' },
  { id: 'app-registration', label: 'App Registration' },
]

type CampaignHealthPanelProps = {
  metrics: CampaignHealthMetric[]
  metricsReady?: boolean
  backgroundReady?: boolean
  /**
   * @deprecated KC-0102A — prefer metricsReady + backgroundReady.
   * When provided alone, treats the entire panel as one gate (legacy).
   */
  ready?: boolean
}

export function CampaignHealthPanel({
  metrics,
  metricsReady,
  backgroundReady,
  ready,
}: CampaignHealthPanelProps) {
  const usePerMetric =
    typeof metricsReady === 'boolean' && typeof backgroundReady === 'boolean'
  const legacyReady = ready ?? true
  const anyReady = usePerMetric
    ? metricsReady || backgroundReady
    : legacyReady
  const allReady = usePerMetric
    ? metricsReady && backgroundReady
    : legacyReady

  const rows: Array<{
    id: string
    label: string
    pct: number | null
    route: string | null
    pending: boolean
  }> = usePerMetric
    ? PLACEHOLDER_METRICS.map((placeholder) => {
        const metric = metrics.find((item) => item.id === placeholder.id)
        const pending = resolveCampaignHealthMetricPending(
          placeholder.id,
          metricsReady,
          backgroundReady,
        )
        return {
          id: placeholder.id,
          label: placeholder.label,
          pct: pending || !metric ? null : metric.pct,
          route: pending || !metric ? null : metric.route,
          pending,
        }
      })
    : metrics.map((metric) => ({
        id: metric.id,
        label: metric.label,
        pct: legacyReady ? metric.pct : null,
        route: legacyReady ? metric.route : null,
        pending: !legacyReady,
      }))

  return (
    <section className="exdash-panel" aria-label="Campaign Health">
      <div className="exdash-section-head">
        <h2 className="exdash-section-title exdash-section-title-sky">
          <span className="exdash-section-icon exdash-section-icon-sky" aria-hidden="true">
            <Icon name="chart" size="sm" />
          </span>
          Campaign Health
        </h2>
        <span className="exdash-section-meta">
          {allReady ? 'Derived summary' : anyReady ? 'Partial' : 'Loading'}
        </span>
      </div>

      {!anyReady && rows.length === 0 ? (
        <p className="exdash-muted" aria-busy="true">
          Loading campaign health…
        </p>
      ) : (
        <ul className="exdash-health-pct-grid">
          {(rows.length > 0 ? rows : PLACEHOLDER_METRICS.map((m) => ({
            id: m.id,
            label: m.label,
            pct: null as number | null,
            route: null as string | null,
            pending: true,
          }))).map((row) => {
            const body = (
              <>
                <p className="exdash-metric-label">{row.label}</p>
                <p
                  className="exdash-metric-value"
                  aria-busy={row.pending || undefined}
                >
                  {row.pending || row.pct == null ? '…' : `${row.pct}%`}
                </p>
              </>
            )
            return (
              <li key={row.id} className="exdash-health-pct-card">
                {row.route && !row.pending ? (
                  <Link to={row.route} className="exdash-health-pct-link">
                    {body}
                  </Link>
                ) : (
                  <div className="exdash-health-pct-link" aria-busy="true">
                    {body}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
