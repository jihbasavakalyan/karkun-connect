import type { Dispatch } from 'react'
import { getCampaignKarkunList } from '@/constants/mockCampaignSetup'
import { InputField } from '@/components/forms/InputField'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { CampaignSetupAction, CampaignSetupState } from '@/types/campaign-setup.types'

type StepKarkunanProps = {
  state: CampaignSetupState
  dispatch: Dispatch<CampaignSetupAction>
}

export function StepKarkunan({ state, dispatch }: StepKarkunanProps) {
  const query = state.karkunSearch.trim().toLowerCase()
  const filteredKarkuns = getCampaignKarkunList().filter(
    (karkun) =>
      karkun.name.toLowerCase().includes(query) ||
      karkun.area.toLowerCase().includes(query),
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-text-heading">Karkunan</h2>
        <p className="mt-1 text-sm text-secondary">
          Select Karkunan to include in this campaign.
        </p>
      </div>

      <InputField
        id="karkun-search"
        label="Search Karkunan"
        type="search"
        placeholder="Search by name or area..."
        value={state.karkunSearch}
        onValueChange={(value) => dispatch({ type: 'SET_KARKUN_SEARCH', value })}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SecondaryButton type="button" fullWidth>
          Import
        </SecondaryButton>
        <SecondaryButton type="button" fullWidth>
          Add Karkun
        </SecondaryButton>
      </div>

      <ul className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {filteredKarkuns.length === 0 ? (
          <li className="rounded-(--radius-card) border border-border bg-surface p-6 text-center text-sm text-secondary">
            No Karkunan match your search.
          </li>
        ) : (
          filteredKarkuns.map((karkun) => {
            const isSelected = state.selectedKarkunIds.includes(karkun.id)

            return (
              <li key={karkun.id}>
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
                    onChange={() => dispatch({ type: 'TOGGLE_KARKUN', karkunId: karkun.id })}
                    className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="flex-1">
                    <span className="block font-medium text-text-heading">{karkun.name}</span>
                    <span className="text-sm text-secondary">{karkun.area}</span>
                  </span>
                </label>
              </li>
            )
          })
        )}
      </ul>

      <p className="text-sm text-secondary">
        {state.selectedKarkunIds.length} Karkunan selected
      </p>
    </div>
  )
}
