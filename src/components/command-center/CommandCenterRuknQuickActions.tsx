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
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Quick Actions" />
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((action) =>
          action.isHash ? (
            <a
              key={action.id}
              href={action.to}
              className="flex items-center gap-2 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/30 hover:bg-surface-muted"
            >
              <span className="text-base" aria-hidden="true">
                {action.icon}
              </span>
              <span className="text-sm font-semibold text-text-heading">{action.label}</span>
            </a>
          ) : (
            <Link
              key={action.id}
              to={action.to}
              className="flex items-center gap-2 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/30 hover:bg-surface-muted"
            >
              <span className="text-base" aria-hidden="true">
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
