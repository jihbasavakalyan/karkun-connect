import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { EnterpriseSectionHeader } from '@/components/enterprise'
import type { NextRecommendedAction } from '@/types/campaignAutomation.types'

type CommandCenterRuknQuickActionsProps = {
  nextAction: NextRecommendedAction
  pendingVisitRoute?: string
}

export function CommandCenterRuknQuickActions({
  nextAction,
  pendingVisitRoute,
}: CommandCenterRuknQuickActionsProps) {
  const actions = [
    pendingVisitRoute
      ? { id: 'next-visit', label: 'Complete Visit', icon: '📍', to: pendingVisitRoute }
      : null,
    { id: 'schedule', label: "Today's Schedule", icon: '📅', to: '#todays-schedule', isHash: true },
    { id: 'follow-ups', label: 'Follow-ups', icon: '🔄', to: ROUTES.RUKN_MY_KARKUN },
    { id: 'karkun', label: 'My Karkun', icon: '👥', to: ROUTES.RUKN_MY_KARKUN },
    { id: 'available', label: 'Available Karkun', icon: '🔍', to: ROUTES.RUKN_AVAILABLE_KARKUN },
    nextAction.route && !nextAction.isCaughtUp
      ? { id: 'annexure', label: 'Submit Annexure-1', icon: '📋', to: nextAction.route }
      : null,
    { id: 'record', label: 'Campaign Record', icon: '📊', to: ROUTES.RUKN_CAMPAIGN_RECORD },
  ].filter(Boolean) as {
    id: string
    label: string
    icon: string
    to: string
    isHash?: boolean
  }[]

  return (
    <section className="enterprise-card p-6">
      <EnterpriseSectionHeader title="Quick Actions" subtitle="Your operational shortcuts" />
      <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3">
        {actions.map((action) =>
          action.isHash ? (
            <a
              key={action.id}
              href={action.to}
              className="enterprise-card-interactive flex min-h-20 flex-col items-start justify-center gap-1 p-4"
            >
              <span className="text-xl" aria-hidden="true">
                {action.icon}
              </span>
              <span className="text-sm font-semibold text-text-heading">{action.label}</span>
            </a>
          ) : (
            <Link
              key={action.id}
              to={action.to}
              className="enterprise-card-interactive flex min-h-20 flex-col items-start justify-center gap-1 p-4"
            >
              <span className="text-xl" aria-hidden="true">
                {action.icon}
              </span>
              <span className="text-sm font-semibold text-text-heading">{action.label}</span>
            </Link>
          ),
        )}
      </div>
    </section>
  )
}
