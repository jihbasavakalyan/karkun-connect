import { Link } from 'react-router-dom'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { EnterpriseBadge, EnterpriseSectionHeader } from '@/components/enterprise'
import type { NextRecommendedAction } from '@/types/campaignAutomation.types'

type CommandCenterNextActionProps = {
  nextAction: NextRecommendedAction
}

export function CommandCenterNextAction({ nextAction }: CommandCenterNextActionProps) {
  return (
    <section
      className={[
        'enterprise-card overflow-hidden p-6 lg:p-8',
        nextAction.isCaughtUp ? 'border-green-200 bg-linear-to-br from-green-50/80 to-surface' : '',
      ].join(' ')}
    >
      <EnterpriseSectionHeader
        title="Next Recommended Action"
        subtitle="Highest priority from Campaign Automation Engine"
      />

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-text-heading">{nextAction.title}</h3>
            {!nextAction.isCaughtUp && (
              <EnterpriseBadge variant="danger">Priority 1</EnterpriseBadge>
            )}
            {nextAction.isCaughtUp && <EnterpriseBadge variant="success">All caught up</EnterpriseBadge>}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            <span className="font-medium text-text-heading">Reason: </span>
            {nextAction.description}
          </p>
        </div>
      </div>

      {!nextAction.isCaughtUp && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to={nextAction.route}>
            <PrimaryButton type="button">{nextAction.actionLabel}</PrimaryButton>
          </Link>
          <span className="text-xs text-secondary">Destination: operational queue</span>
        </div>
      )}
    </section>
  )
}
