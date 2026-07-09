import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import type { NextRecommendedAction } from '@/types/campaignAutomation.types'
import type { IconName } from '@/design-system/iconNames'
import { Icon } from '@/components/ui/Icon'
import { HomeSection } from './HomeSection'

type RuknQuickActionsBarProps = {
  nextAction: NextRecommendedAction
}

const QUICK_ACTIONS: { id: string; label: string; icon: IconName; to: string }[] = [
  { id: 'connect', label: 'Connect Karkun', icon: 'link', to: ROUTES.RUKN_AVAILABLE_KARKUN },
  { id: 'connected', label: 'My Karkuns', icon: 'users', to: ROUTES.RUKN_MY_KARKUN },
  { id: 'record', label: 'Campaign Record', icon: 'chart', to: ROUTES.RUKN_CAMPAIGN_RECORD },
]

export function RuknQuickActionsBar({ nextAction }: RuknQuickActionsBarProps) {
  const actions = [
    ...QUICK_ACTIONS,
    !nextAction.isCaughtUp
      ? {
          id: 'visit',
          label: 'Record Visit',
          icon: 'clipboard' as IconName,
          to: nextAction.route,
        }
      : null,
  ].filter(Boolean) as { id: string; label: string; icon: IconName; to: string }[]

  return (
    <HomeSection title="Quick Actions">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((action) => (
          <Link key={action.id} to={action.to} className="home-quick-action">
            <Icon name={action.icon} size="lg" />
            <span className="text-sm font-semibold text-text-heading">{action.label}</span>
          </Link>
        ))}
        <a href="#todays-schedule" className="home-quick-action">
          <Icon name="calendar" size="lg" />
          <span className="text-sm font-semibold text-text-heading">Schedule</span>
        </a>
      </div>
    </HomeSection>
  )
}
