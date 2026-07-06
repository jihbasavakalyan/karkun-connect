import { PrimaryButton } from '@/components/ui/PrimaryButton'

type AdminMissionData = {
  variant: 'admin'
  title: string
  summary: string
  estimatedTime: string
  actionLabel: string
}

type RuknMissionData = {
  variant: 'rukn'
  title: string
  visitName: string
  area: string
  estimatedTime: string
  actionLabel: string
}

type TodaysMissionCardProps = AdminMissionData | RuknMissionData

export function TodaysMissionCard(props: TodaysMissionCardProps) {
  return (
    <article className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">{props.title}</h2>

      {props.variant === 'admin' ? (
        <p className="mt-4 text-2xl font-semibold text-text-heading">{props.summary}</p>
      ) : (
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-sm text-secondary">Visit</dt>
            <dd className="text-lg font-semibold text-text-heading">{props.visitName}</dd>
          </div>
          <div>
            <dt className="text-sm text-secondary">Area</dt>
            <dd className="text-lg font-semibold text-text-heading">{props.area}</dd>
          </div>
        </dl>
      )}

      <p className="mt-4 text-sm text-secondary">
        Estimated Time{' '}
        <span className="font-medium text-text-heading">{props.estimatedTime}</span>
      </p>

      <div className="mt-6">
        <PrimaryButton type="button" fullWidth={props.variant === 'rukn'}>
          {props.actionLabel}
        </PrimaryButton>
      </div>
    </article>
  )
}
