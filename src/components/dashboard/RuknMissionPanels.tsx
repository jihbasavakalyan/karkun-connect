import type { RuknMission } from '@/constants/mockMissions'

type CurrentVisitPanelProps = {
  mission?: RuknMission
}

export function CurrentVisitPanel({ mission }: CurrentVisitPanelProps) {
  if (!mission) {
    return null
  }

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Current Visit</h2>
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
    </section>
  )
}

type NextMissionPanelProps = {
  mission?: RuknMission
}

export function NextMissionPanel({ mission }: NextMissionPanelProps) {
  if (!mission) {
    return null
  }

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Next Mission</h2>
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
    </section>
  )
}

type CompletedWorkPanelProps = {
  items: { id: string; label: string; time: string }[]
}

export function CompletedWorkPanel({ items }: CompletedWorkPanelProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Completed Work</h2>
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
    </section>
  )
}
