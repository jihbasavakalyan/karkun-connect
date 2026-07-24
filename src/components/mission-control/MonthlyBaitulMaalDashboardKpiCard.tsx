/**
 * KC-0108 — Admin dashboard Baitul Maal KPI (completion % + submission progress).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  adminMonthlyBaitulMaalPath,
  adminMonthlyBaitulMaalReportPath,
} from '@/constants/routes'
import { getMonthlyBaitulMaalDashboardKpi } from '@/services/monthlyBaitulMaalService'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { formatMonthlyBaitulMaalLabel } from '@/types/monthlyBaitulMaal'

export function MonthlyBaitulMaalDashboardKpiCard() {
  const [, setVersion] = useState(0)

  useEffect(() => subscribeToMonthlyBaitulMaalStore(() => setVersion((v) => v + 1)), [])

  const kpi = getMonthlyBaitulMaalDashboardKpi()

  if (!kpi.cycleId) {
    return (
      <section className="exdash-panel" aria-label="Baitul Maal">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title exdash-section-title-amber">Baitul Maal</h2>
          <Link to={adminMonthlyBaitulMaalPath()} className="exdash-section-link">
            Manage →
          </Link>
        </div>
        <p className="exdash-muted">No monthly cycle yet. Create one to track completion.</p>
      </section>
    )
  }

  return (
    <section className="exdash-panel" aria-label="Baitul Maal">
      <div className="exdash-section-head">
        <div>
          <h2 className="exdash-section-title exdash-section-title-amber">Baitul Maal</h2>
          <p className="exdash-action-center-sub">
            {kpi.title}
            {kpi.monthKey ? ` · ${formatMonthlyBaitulMaalLabel(kpi.monthKey)}` : ''}
            {kpi.cycleStatus ? ` · ${kpi.cycleStatus}` : ''}
          </p>
        </div>
        <Link to={adminMonthlyBaitulMaalReportPath(kpi.cycleId)} className="exdash-section-link">
          Report →
        </Link>
      </div>

      <ul className="exdash-metric-grid">
        <li className="exdash-metric-card">
          <p className="exdash-metric-label">Completion</p>
          <p className="exdash-metric-value">{kpi.completionPct}%</p>
          <p className="exdash-metric-hint">
            {kpi.contributed} contributed · {kpi.pending} pending
          </p>
        </li>
        <li className="exdash-metric-card">
          <p className="exdash-metric-label">Submitted</p>
          <p className="exdash-metric-value">
            {kpi.ruknsSubmitted} / {kpi.ruknsTotal}
          </p>
          <p className="exdash-metric-hint">Rukns submitted</p>
        </li>
        <li className="exdash-metric-card">
          <p className="exdash-metric-label">Pending</p>
          <p className="exdash-metric-value">{kpi.ruknsPending}</p>
          <p className="exdash-metric-hint">Rukns</p>
        </li>
      </ul>

      <div className="exdash-action-footer">
        <Link to={adminMonthlyBaitulMaalPath()} className="exdash-section-link">
          Open Baitul Maal →
        </Link>
      </div>
    </section>
  )
}
