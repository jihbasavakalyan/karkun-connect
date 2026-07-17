/**
 * Campaign-level relationship intelligence for Administrator (KC-012).
 * Summaries only — no individual Karkun drill-down unless via Rukn links.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { adminRuknDetailPath } from '@/constants/routes'
import { buildAdminRelationshipInsights } from '@/lib/relationshipIntelligencePresentation'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'

export function AdminRelationshipInsightsPanel() {
  const { assignmentVersion } = useAssignmentEngine()

  const insights = useMemo(() => {
    void assignmentVersion
    return buildAdminRelationshipInsights()
  }, [assignmentVersion])

  if (insights.totalConnected === 0) {
    return null
  }

  return (
    <section className="mc-panel mc-panel-wide ri-admin-panel" aria-label="Relationship insights">
      <h2 className="mc-panel-title">Relationship Intelligence</h2>
      <p className="mc-caption">
        Campaign overview — who needs support, without drowning in individual records.
      </p>

      <div className="ri-admin-summary">
        <div className="ri-admin-metric">
          <span className="ri-admin-metric-label">Connected</span>
          <strong className="ri-admin-metric-value">{insights.totalConnected}</strong>
        </div>
        <div className="ri-admin-metric">
          <span className="ri-admin-metric-label">Need attention</span>
          <strong className="ri-admin-metric-value">{insights.needingAttention}</strong>
        </div>
        <div className="ri-admin-metric">
          <span className="ri-admin-metric-label">Average health</span>
          <strong className="ri-admin-metric-value">{insights.averageHealthLabel}</strong>
        </div>
      </div>

      <div className="ri-admin-grid">
        <div>
          <h3 className="ri-admin-subheading">Health distribution</h3>
          <ul className="ri-admin-list">
            {insights.healthDistribution.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="ri-admin-subheading">Journey stages</h3>
          {insights.journeyDistribution.length === 0 ? (
            <p className="mc-caption">No journey data yet.</p>
          ) : (
            <ul className="ri-admin-list">
              {insights.journeyDistribution.slice(0, 5).map((item) => (
                <li key={item.stageId}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="ri-admin-support">
        <h3 className="ri-admin-subheading">Areas requiring support</h3>
        <ul className="ri-admin-bullets">
          {insights.supportAreas.map((area) => (
            <li key={area}>{area}</li>
          ))}
        </ul>
      </div>

      {insights.overdueFollowUpRukns.length > 0 ? (
        <div>
          <h3 className="ri-admin-subheading">Rukns with overdue follow-ups</h3>
          <ul className="ri-admin-rukn-list">
            {insights.overdueFollowUpRukns.map((rukn) => (
              <li key={rukn.ruknId}>
                <Link to={adminRuknDetailPath(rukn.ruknId)} className="ri-admin-rukn-link">
                  <span>{rukn.ruknName}</span>
                  <span className="mc-caption">{rukn.count} need attention</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
