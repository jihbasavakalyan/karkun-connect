import type { Dispatch } from 'react'
import { MOCK_RUKN_LIST } from '@/constants/mockCampaignSetup'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { CampaignSetupAction, CampaignSetupState } from '@/types/campaign-setup.types'

type StepRuknProps = {
  state: CampaignSetupState
  dispatch: Dispatch<CampaignSetupAction>
}

export function StepRukn({ state, dispatch }: StepRuknProps) {
  const selectedRukns = MOCK_RUKN_LIST.filter((rukn) =>
    state.selectedRuknIds.includes(rukn.id),
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-heading">Campaign Team</h2>
          <p className="mt-1 text-sm text-secondary">
            Select Rukn who will supervise field work during this campaign.
          </p>
        </div>
        <SecondaryButton type="button" className="shrink-0">
          Add Rukn
        </SecondaryButton>
      </div>

      {selectedRukns.length > 0 && (
        <section className="rounded-(--radius-card) border border-primary/30 bg-primary-muted/30 p-4">
          <h3 className="text-sm font-semibold text-text-heading">Selected Rukn</h3>
          <ul className="mt-2 space-y-1">
            {selectedRukns.map((rukn) => (
              <li key={rukn.id} className="text-sm text-text-heading">
                {rukn.name} · {rukn.area}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="space-y-3">
        {MOCK_RUKN_LIST.map((rukn) => {
          const isSelected = state.selectedRuknIds.includes(rukn.id)

          return (
            <li key={rukn.id}>
              <label
                className={[
                  'flex cursor-pointer items-center gap-4 rounded-(--radius-card) border p-4',
                  isSelected
                    ? 'border-primary bg-primary-muted/40 shadow-card'
                    : 'border-border bg-surface hover:shadow-card',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => dispatch({ type: 'TOGGLE_RUKN', ruknId: rukn.id })}
                  className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="flex-1">
                  <span className="block font-medium text-text-heading">{rukn.name}</span>
                  <span className="text-sm text-secondary">{rukn.area}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <p className="text-sm text-secondary">
        {state.selectedRuknIds.length} Rukn selected
      </p>
    </div>
  )
}
