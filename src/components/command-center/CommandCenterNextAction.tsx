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
        'cc-card-sm',
        nextAction.isCaughtUp ? 'border-green-200 bg-green-50/50' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="enterprise-section-title">Next Action</h2>
            {!nextAction.isCaughtUp ? (
              <EnterpriseBadge variant="danger">P1</EnterpriseBadge>
            ) : (
              <EnterpriseBadge variant="success">Clear</EnterpriseBadge>
            )}
          </div>
          <h3 className="mt-0.5 line-clamp-1 text-sm font-bold text-text-heading">{nextAction.title}</h3>
          <p className="line-clamp-1 text-xs text-secondary">{nextAction.description}</p>
        </div>
        {!nextAction.isCaughtUp && (
          <Link to={nextAction.route} className="shrink-0">
            <PrimaryButton type="button" className="px-3 py-1.5 text-xs">
              {nextAction.actionLabel}
            </PrimaryButton>
          </Link>
        )}
      </div>
    </section>
  )
}
