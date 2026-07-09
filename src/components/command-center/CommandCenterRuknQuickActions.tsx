import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import type { IconName } from '@/design-system/iconNames'
import { Icon } from '@/components/ui/Icon'
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
      ? { id: 'next-visit', label: 'Visit', icon: 'location' as IconName, to: pendingVisitRoute }
      : null,
    { id: 'schedule', label: 'Schedule', icon: 'calendar' as IconName, to: '#todays-schedule', isHash: true },
    { id: 'follow-ups', label: 'Follow-ups', icon: 'refresh' as IconName, to: ROUTES.RUKN_MY_KARKUN },
    { id: 'karkun', label: 'My Karkun', icon: 'users' as IconName, to: ROUTES.RUKN_MY_KARKUN },
    { id: 'available', label: 'Available', icon: 'search' as IconName, to: ROUTES.RUKN_AVAILABLE_KARKUN },
    nextAction.route && !nextAction.isCaughtUp
      ? { id: 'annexure', label: 'Record Visit', icon: 'clipboard' as IconName, to: nextAction.route }
      : null,
    { id: 'record', label: 'Record', icon: 'chart' as IconName, to: ROUTES.RUKN_CAMPAIGN_RECORD },
  ].filter(Boolean) as {
    id: string
    label: string
    icon: IconName
    to: string
    isHash?: boolean
  }[]

  return (
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Quick Actions" />
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        {actions.map((action) =>
          action.isHash ? (
            <a
              key={action.id}
              href={action.to}
              className="flex items-center gap-1.5 rounded border border-border px-2 py-1.5 text-xs transition-colors hover:border-primary/30 hover:bg-surface-muted"
            >
              <Icon name={action.icon} size="sm" className="text-primary" />
              <span className="truncate font-semibold text-text-heading">{action.label}</span>
            </a>
          ) : (
            <Link
              key={action.id}
              to={action.to}
              className="flex items-center gap-1.5 rounded border border-border px-2 py-1.5 text-xs transition-colors hover:border-primary/30 hover:bg-surface-muted"
            >
              <Icon name={action.icon} size="sm" className="text-primary" />
              <span className="truncate font-semibold text-text-heading">{action.label}</span>
            </Link>
          ),
        )}
      </div>
    </section>
  )
}
