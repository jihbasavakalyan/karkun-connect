import { Link } from 'react-router-dom'
import { ROUTES, ruknVisitPath } from '@/constants/routes'
import { getFirstPendingKarkunIdForRukn } from '@/lib/executionStatus'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { RuknMission } from '@/constants/mockMissions'

type CurrentVisitPanelProps = {
  mission?: RuknMission
  pendingKarkunId?: string
}

export function CurrentVisitPanel({ mission, pendingKarkunId }: CurrentVisitPanelProps) {
  const visitKarkunId = pendingKarkunId

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Current Visit</h2>

      {mission ? (
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-sm text-secondary">Visit</dt>
            <dd className="text-lg font-semibold text-text-heading">
              {mission.visitName ?? mission.title}
            </dd>
          </div>
          {mission.area && (
            <div>
              <dt className="text-sm text-secondary">Area</dt>
              <dd className="text-lg font-semibold text-text-heading">{mission.area}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-secondary">No active visit.</p>
      )}

      {visitKarkunId && (
        <Link to={ruknVisitPath(visitKarkunId)} className="mt-4 inline-block">
          <SecondaryButton type="button" fullWidth>
            Open Annexure-1
          </SecondaryButton>
        </Link>
      )}
    </section>
  )
}

type NextMissionPanelProps = {
  mission?: RuknMission
}

export function NextMissionPanel({ mission }: NextMissionPanelProps) {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Next Mission</h2>

      {mission ? (
        <div className="mt-4">
          <p className="text-lg font-semibold text-text-heading">{mission.title}</p>
          {mission.visitName && (
            <p className="mt-1 text-sm text-secondary">
              {mission.visitName}
              {mission.area ? ` · ${mission.area}` : ''}
            </p>
          )}
          <p className="mt-2 text-sm text-secondary">
            Estimated Time{' '}
            <span className="font-medium text-text-heading">{mission.estimatedTime}</span>
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-secondary">All missions complete for today.</p>
      )}
    </section>
  )
}

type CompletedWorkPanelProps = {
  items: { id: string; label: string; time: string }[]
}

export function CompletedWorkPanel({ items }: CompletedWorkPanelProps) {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Completed Work</h2>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-secondary">No completed work yet today.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3"
            >
              <span className="text-sm font-medium text-text-heading">{item.label}</span>
              <span className="shrink-0 text-xs text-secondary">{item.time}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type ContinueMissionButtonProps = {
  ruknId: string
}

export function ContinueMissionButton({ ruknId }: ContinueMissionButtonProps) {
  const pendingKarkunId = getFirstPendingKarkunIdForRukn(ruknId)

  if (!pendingKarkunId) {
    return (
      <Link to={ROUTES.RUKN_MY_KARKUN} className="mt-4 inline-block w-full">
        <SecondaryButton type="button" fullWidth>
          View My Karkun
        </SecondaryButton>
      </Link>
    )
  }

  return (
    <div className="mt-4">
      <Link to={ruknVisitPath(pendingKarkunId)}>
        <SecondaryButton type="button" fullWidth>
          Continue Annexure-1
        </SecondaryButton>
      </Link>
    </div>
  )
}
