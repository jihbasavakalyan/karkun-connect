import type { ReactNode } from 'react'
import {
  APPROVED_CAMPAIGN_OBJECTIVES,
  MOCK_KARKUN_LIST,
  MOCK_RUKN_LIST,
} from '@/constants/mockCampaignSetup'
import type { CampaignSetupState } from '@/types/campaign-setup.types'

type StepCampaignReviewProps = {
  state: CampaignSetupState
}

function ReviewSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">{title}</h3>
      <div className="mt-3 space-y-2 text-sm text-text-heading">{children}</div>
    </section>
  )
}

export function StepCampaignReview({ state }: StepCampaignReviewProps) {
  const enabledObjectives = APPROVED_CAMPAIGN_OBJECTIVES.filter(
    (objective) => state.enabledObjectives[objective.id],
  )

  const selectedRukns = MOCK_RUKN_LIST.filter((rukn) =>
    state.selectedRuknIds.includes(rukn.id),
  )

  const selectedKarkuns = MOCK_KARKUN_LIST.filter((karkun) =>
    state.selectedKarkunIds.includes(karkun.id),
  )

  const assignmentSummary = selectedRukns.map((rukn) => {
    const count = state.assignments[rukn.id]?.length ?? 0
    return `${rukn.name}: ${count} Karkunan`
  })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-text-heading">Campaign Review</h2>
        <p className="mt-1 text-sm text-secondary">
          Review all campaign settings before proceeding to launch.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReviewSection title="Campaign Information">
          <p>
            <span className="text-secondary">Name: </span>
            {state.name || '—'}
          </p>
          <p>
            <span className="text-secondary">Start: </span>
            {state.startDate || '—'}
          </p>
          <p>
            <span className="text-secondary">End: </span>
            {state.endDate || '—'}
          </p>
          <p>
            <span className="text-secondary">Description: </span>
            {state.description || '—'}
          </p>
        </ReviewSection>

        <ReviewSection title="Campaign Objectives">
          {enabledObjectives.length === 0 ? (
            <p className="text-secondary">No objectives enabled.</p>
          ) : (
            <ul className="list-inside list-disc space-y-1">
              {enabledObjectives.map((objective) => (
                <li key={objective.id}>{objective.label}</li>
              ))}
            </ul>
          )}
        </ReviewSection>

        <ReviewSection title="Campaign Team">
          {selectedRukns.length === 0 ? (
            <p className="text-secondary">None selected.</p>
          ) : (
            <ul className="list-inside list-disc space-y-1">
              {selectedRukns.map((rukn) => (
                <li key={rukn.id}>
                  {rukn.name} ({rukn.area})
                </li>
              ))}
            </ul>
          )}
        </ReviewSection>

        <ReviewSection title="Karkunan Summary">
          <p>
            <span className="text-secondary">Total selected: </span>
            <span className="text-lg font-semibold">{state.selectedKarkunIds.length}</span>
          </p>
          {selectedKarkuns.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1">
              {selectedKarkuns.map((karkun) => (
                <li key={karkun.id}>
                  {karkun.name} ({karkun.area})
                </li>
              ))}
            </ul>
          )}
        </ReviewSection>
      </div>

      <ReviewSection title="Assignment Summary">
        {assignmentSummary.length === 0 ? (
          <p className="text-secondary">No assignments configured.</p>
        ) : (
          <ul className="list-inside list-disc space-y-1">
            {assignmentSummary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </ReviewSection>
    </div>
  )
}
