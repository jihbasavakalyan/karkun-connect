import { Link } from 'react-router-dom'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { EnterpriseBadge } from '@/components/enterprise'
import type { NextRecommendedAction } from '@/types/campaignAutomation.types'

type CommandCenterNextActionProps = {
  nextAction: NextRecommendedAction
}

export function CommandCenterNextAction({ nextAction }: CommandCenterNextActionProps) {
  return (
    <section
      className={[
        'cc-card-sm flex h-full flex-col',
        nextAction.isCaughtUp ? 'border-green-200 bg-green-50/50' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-text-heading">Next Action</h2>
        {!nextAction.isCaughtUp ? (
          <EnterpriseBadge variant="danger">Priority 1</EnterpriseBadge>
        ) : (
          <EnterpriseBadge variant="success">Caught up</EnterpriseBadge>
        )}
      </div>

      <h3 className="mt-2 text-base font-bold text-text-heading">{nextAction.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-secondary">{nextAction.description}</p>

      {!nextAction.isCaughtUp && (
        <div className="mt-auto pt-3">
          <Link to={nextAction.route}>
            <PrimaryButton type="button" className="text-sm">
              {nextAction.actionLabel}
            </PrimaryButton>
          </Link>
        </div>
      )}
    </section>
  )
}
