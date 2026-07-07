import { getCampaignKarkunList } from '@/constants/mockCampaignSetup'
import { ruknMaster } from '@/data/ruknMaster'
import type { CampaignSetupState } from '@/types/campaign-setup.types'

type StepAssignmentPreviewProps = {
  state: CampaignSetupState
}

function getKarkunName(karkunId: string): string {
  return getCampaignKarkunList().find((k) => k.id === karkunId)?.name ?? karkunId
}

export function StepAssignmentPreview({ state }: StepAssignmentPreviewProps) {
  const selectedRukns = ruknMaster.filter((rukn) =>
    state.selectedRuknIds.includes(rukn.id),
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-text-heading">Assignment Preview</h2>
        <p className="mt-1 text-sm text-secondary">
          Review how Karkunan are assigned to each Rukn. Drag-and-drop reassignment will be
          available in a future sprint.
        </p>
      </div>

      {selectedRukns.length === 0 ? (
        <p className="rounded-(--radius-card) border border-border bg-surface p-6 text-center text-sm text-secondary">
          No Rukn selected. Go back to select at least one Rukn.
        </p>
      ) : (
        <ul className="space-y-4">
          {selectedRukns.map((rukn) => {
            const assignedIds = state.assignments[rukn.id] ?? []

            return (
              <li
                key={rukn.id}
                className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg bg-surface-muted text-secondary"
                    aria-hidden="true"
                    title="Drag placeholder"
                  >
                    ⠿
                  </span>
                  <div>
                    <p className="font-semibold text-text-heading">{rukn.name}</p>
                    <p className="text-sm text-secondary">{rukn.place}</p>
                  </div>
                </div>

                <div className="my-4 flex justify-center text-secondary" aria-hidden="true">
                  ↓
                </div>

                <div className="rounded-lg border border-dashed border-border bg-surface-muted p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-secondary">
                    Assigned Karkunan
                  </p>

                  {assignedIds.length === 0 ? (
                    <p className="text-sm text-secondary">No Karkunan assigned yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {assignedIds.map((karkunId) => (
                        <li
                          key={karkunId}
                          className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                        >
                          <span
                            className="cursor-grab text-secondary"
                            aria-hidden="true"
                            title="Drag placeholder"
                          >
                            ⠿
                          </span>
                          <span className="text-sm font-medium text-text-heading">
                            {getKarkunName(karkunId)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
