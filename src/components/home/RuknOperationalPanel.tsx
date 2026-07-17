/**
 * Rukn Home — operational mission strip (KC-006 Sprint 6.6).
 */

import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { getRuknBaitulMaalMetrics } from '@/services/baitulMaalService'
import { getCurrentIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import { getDevelopmentAssessment } from '@/stores/developmentAssessmentStore'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import type { RuknCommandCenterSnapshot } from '@/types/campaignAutomation.types'

type RuknOperationalPanelProps = {
  ruknId: string
  snapshot: RuknCommandCenterSnapshot
}

export function RuknOperationalPanel({ ruknId, snapshot }: RuknOperationalPanelProps) {
  const { getAssignedKarkunanForRukn } = useAssignmentEngine()
  const connected = getAssignedKarkunanForRukn(ruknId)
  const baitulMaal = getRuknBaitulMaalMetrics(connected.map((karkun) => karkun.id))
  const guidance = getGuidanceForRuknKarkuns(ruknId)

  const missingIjtema = connected.filter(
    (karkun) => getCurrentIjtemaAttendance(karkun.id).status === 'Not recorded',
  ).length

  const pendingFollowUps = snapshot.followUpQueue.reduce(
    (sum, group) => sum + group.items.length,
    0,
  )

  const assessmentsDue = connected.filter((karkun) => {
    const stage = guidance.find((item) => item.karkunId === karkun.id)?.currentStage
    if (stage !== 'development') return false
    const assessment = getDevelopmentAssessment(karkun.id)
    return !assessment?.indicators.ready_for_next_stage
  }).length

  const visitQueue = snapshot.schedule
    .filter((item) => /visit|meeting/i.test(item.title) || /visit|meeting/i.test(item.type ?? ''))
    .slice(0, 3)

  const items = [
    {
      id: 'mission',
      label: "Today's Mission",
      value: snapshot.nextAction.title,
      route: snapshot.nextAction.route || ROUTES.RUKN_MY_KARKUN,
    },
    {
      id: 'ijtema',
      label: 'Weekly Ijtema Reminder',
      value: missingIjtema > 0 ? `${missingIjtema} not recorded` : 'Attendance complete',
      route: '#',
    },
    {
      id: 'baitul-maal',
      label: 'Pending Bait-ul-Maal',
      value: String(baitulMaal.pending),
      route: ROUTES.RUKN_MY_KARKUN,
    },
    {
      id: 'follow-ups',
      label: 'Pending Follow-ups',
      value: String(pendingFollowUps),
      route: ROUTES.RUKN_MY_KARKUN,
    },
    {
      id: 'development',
      label: 'Development Assessments Due',
      value: String(assessmentsDue),
      route: ROUTES.RUKN_MY_KARKUN,
    },
  ]

  return (
    <section className="cd-panel cd-panel-primary" aria-label="Rukn operational focus">
      <h2 className="cd-section-heading">Operational focus</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-border bg-surface-muted px-3 py-2">
            <span className="block text-xs text-secondary">{item.label}</span>
            {item.route === '#' ? (
              <span className="mt-0.5 block text-sm font-semibold text-text-heading">{item.value}</span>
            ) : (
              <Link to={item.route} className="mt-0.5 block text-sm font-semibold text-primary">
                {item.value}
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-text-heading">Visit Queue</h3>
        {visitQueue.length === 0 ? (
          <p className="cd-caption mt-1">No visits scheduled in today&apos;s timeline.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {visitQueue.map((item) => (
              <li key={item.id} className="text-sm text-secondary">
                {item.title}
                {item.time ? ` · ${item.time}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
