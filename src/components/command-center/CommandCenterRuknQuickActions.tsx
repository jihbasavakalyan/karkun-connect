import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
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
      ? { id: 'next-visit', label: 'Open Next Visit', to: pendingVisitRoute }
      : null,
      { id: 'schedule', label: "Today's Schedule", to: '#todays-schedule', isHash: true },
    { id: 'follow-ups', label: 'Pending Follow-ups', to: ROUTES.RUKN_MY_KARKUN },
    nextAction.route && !nextAction.isCaughtUp
      ? { id: 'annexure', label: 'Submit Annexure-1', to: nextAction.route }
      : null,
  ].filter(Boolean) as { id: string; label: string; to: string; isHash?: boolean }[]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Quick Actions</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {actions.map((action) =>
          action.isHash ? (
            <a key={action.id} href={action.to} className="block">
              <SecondaryButton type="button" fullWidth>
                {action.label}
              </SecondaryButton>
            </a>
          ) : (
            <Link key={action.id} to={action.to}>
              <SecondaryButton type="button" fullWidth>
                {action.label}
              </SecondaryButton>
            </Link>
          ),
        )}
      </div>
    </section>
  )
}
