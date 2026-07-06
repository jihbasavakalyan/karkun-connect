import { PrimaryButton } from '@/components/ui/PrimaryButton'

type MissionHeroCardProps = {
  missionTitle: string
  estimatedTime: string
  actionLabel?: string
}

export function MissionHeroCard({
  missionTitle,
  estimatedTime,
  actionLabel = 'Continue Mission',
}: MissionHeroCardProps) {
  return (
    <article className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <p className="text-sm font-medium text-secondary">Today&apos;s Mission</p>
      <h2 className="mt-2 text-2xl font-semibold text-text-heading">{missionTitle}</h2>
      <p className="mt-3 text-sm text-secondary">
        Estimated Time{' '}
        <span className="font-medium text-text-heading">{estimatedTime}</span>
      </p>
      <div className="mt-6">
        <PrimaryButton type="button">{actionLabel}</PrimaryButton>
      </div>
    </article>
  )
}
