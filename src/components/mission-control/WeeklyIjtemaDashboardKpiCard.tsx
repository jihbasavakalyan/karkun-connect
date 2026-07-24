/**
 * KC-0107 — Admin dashboard Weekly Ijtema KPI (attendance % + submission progress).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  adminWeeklyIjtemaPath,
  adminWeeklyIjtemaReportPath,
} from '@/constants/routes'
import { getWeeklyIjtemaDashboardKpi } from '@/services/weeklyIjtemaService'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import { formatWeeklyIjtemaMeetingLabel } from '@/types/weeklyIjtema'

export function WeeklyIjtemaDashboardKpiCard() {
  const [, setVersion] = useState(0)

  useEffect(() => subscribeToWeeklyIjtemaStore(() => setVersion((v) => v + 1)), [])

  const kpi = getWeeklyIjtemaDashboardKpi()

  if (!kpi.eventId) {
    return (
      <section className="exdash-panel" aria-label="Weekly Ijtema">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title exdash-section-title-teal">Weekly Ijtema</h2>
          <Link to={adminWeeklyIjtemaPath()} className="exdash-section-link">
            Manage →
          </Link>
        </div>
        <p className="exdash-muted">No Weekly Ijtema event yet. Create one to track attendance.</p>
      </section>
    )
  }

  return (
    <section className="exdash-panel" aria-label="Weekly Ijtema">
      <div className="exdash-section-head">
        <div>
          <h2 className="exdash-section-title exdash-section-title-teal">Weekly Ijtema</h2>
          <p className="exdash-action-center-sub">
            {kpi.title}
            {kpi.meetingDate ? ` · ${formatWeeklyIjtemaMeetingLabel(kpi.meetingDate)}` : ''}
            {kpi.eventStatus ? ` · ${kpi.eventStatus}` : ''}
          </p>
        </div>
        <Link to={adminWeeklyIjtemaReportPath(kpi.eventId)} className="exdash-section-link">
          Report →
        </Link>
      </div>

      <ul className="exdash-metric-grid">
        <li className="exdash-metric-card">
          <p className="exdash-metric-label">Attendance</p>
          <p className="exdash-metric-value">{kpi.attendancePct}%</p>
          <p className="exdash-metric-hint">
            {kpi.present} present · {kpi.absent} absent
          </p>
        </li>
        <li className="exdash-metric-card">
          <p className="exdash-metric-label">Submission</p>
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
        <Link to={adminWeeklyIjtemaPath()} className="exdash-section-link">
          Open Weekly Ijtema →
        </Link>
      </div>
    </section>
  )
}
