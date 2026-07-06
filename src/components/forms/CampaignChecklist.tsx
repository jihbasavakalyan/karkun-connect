import { CAMPAIGN_CHECKLIST_ITEMS } from '@/constants/mockCampaignSetup'
import { getChecklistCompletion } from '@/hooks/useCampaignSetupWizard'
import type { CampaignSetupState } from '@/types/campaign-setup.types'

type CampaignChecklistProps = {
  state: CampaignSetupState
}

export function CampaignChecklist({ state }: CampaignChecklistProps) {
  const completion = getChecklistCompletion(state)

  return (
    <aside
      className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card"
      aria-label="Campaign setup checklist"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
        Campaign Checklist
      </h2>

      <ul className="mt-4 space-y-3">
        {CAMPAIGN_CHECKLIST_ITEMS.map((item) => {
          const isComplete = completion[item.id]

          return (
            <li key={item.id} className="flex items-start gap-3 text-sm">
              <span
                className={[
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isComplete
                    ? 'bg-primary text-surface'
                    : 'border border-border bg-surface text-secondary',
                ].join(' ')}
                aria-hidden="true"
              >
                {isComplete ? '✓' : '○'}
              </span>
              <span
                className={isComplete ? 'font-medium text-text-heading' : 'text-secondary'}
              >
                {item.label}
              </span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
