import { useMemo, useState, type Dispatch } from 'react'
import { ruknMaster, searchRukn } from '@/data/ruknMaster'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import type { CampaignSetupAction, CampaignSetupState } from '@/types/campaign-setup.types'

type StepRuknProps = {
  state: CampaignSetupState
  dispatch: Dispatch<CampaignSetupAction>
}

export function StepRukn({ state, dispatch }: StepRuknProps) {
  const peopleVersion = usePeopleStore()
  const [query, setQuery] = useState('')

  const filteredRukn = useMemo(
    () => searchRukn(query),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registry is module state
    [query, peopleVersion],
  )

  const selectedRukns = useMemo(
    () => ruknMaster.filter((rukn) => state.selectedRuknIds.includes(rukn.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registry is module state
    [state.selectedRuknIds, peopleVersion],
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
      </div>

      <p className="rounded-lg border border-border/70 bg-surface-muted/50 px-4 py-3 text-sm text-secondary">
        Select from existing Rukn below. To add new Rukn, use the{' '}
        <span className="font-medium text-text-heading">Rukn</span> module first, then return here.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="campaign-team-search" className="text-sm font-medium text-text-heading">
          Search Rukn
        </label>
        <input
          id="campaign-team-search"
          type="search"
          value={query}
          placeholder="Search by name..."
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading placeholder:text-secondary-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {selectedRukns.length > 0 && (
        <section className="rounded-(--radius-card) border border-primary/30 bg-primary-muted/30 p-4">
          <h3 className="text-sm font-semibold text-text-heading">Selected Rukn</h3>
          <ul className="mt-2 space-y-1">
            {selectedRukns.map((rukn) => (
              <li key={rukn.id} className="text-sm text-text-heading">
                {rukn.name} · {rukn.place}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="space-y-3">
        {filteredRukn.map((rukn) => {
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
                  <span className="text-sm text-secondary">{rukn.place}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <p className="text-sm text-secondary">
        {state.selectedRuknIds.length} Rukn selected · {ruknMaster.length} total in master
      </p>
    </div>
  )
}
