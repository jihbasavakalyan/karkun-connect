import { Link } from 'react-router-dom'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import type { NextRecommendedAction } from '@/types/campaignAutomation.types'

type CommandCenterNextActionProps = {
  nextAction: NextRecommendedAction
}

export function CommandCenterNextAction({ nextAction }: CommandCenterNextActionProps) {
  return (
    <section
      className={[
        'rounded-(--radius-card) border p-6 shadow-card',
        nextAction.isCaughtUp
          ? 'border-green-200 bg-green-50/50'
          : 'border-primary/30 bg-surface',
      ].join(' ')}
    >
      <p className="text-sm font-medium uppercase tracking-wide text-primary">Next Recommended Action</p>
      <h2 className="mt-2 text-xl font-semibold text-text-heading">{nextAction.title}</h2>
      <p className="mt-2 text-sm text-secondary">{nextAction.description}</p>
      {!nextAction.isCaughtUp && (
        <Link to={nextAction.route} className="mt-4 inline-block">
          <PrimaryButton type="button">{nextAction.actionLabel}</PrimaryButton>
        </Link>
      )}
    </section>
  )
}
