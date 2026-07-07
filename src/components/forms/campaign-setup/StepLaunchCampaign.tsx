import { ruknMaster } from '@/data/ruknMaster'
import {
  formatCampaignDuration,
  getTotalAssignments,
} from '@/hooks/useCampaignSetupWizard'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import type { CampaignSetupState } from '@/types/campaign-setup.types'

type StepLaunchCampaignProps = {
  state: CampaignSetupState
  onLaunch: () => void
}

export function StepLaunchCampaign({ state, onLaunch }: StepLaunchCampaignProps) {
  const selectedRukns = ruknMaster.filter((rukn) =>
    state.selectedRuknIds.includes(rukn.id),
  )
  const totalAssignments = getTotalAssignments(state)
  const duration = formatCampaignDuration(state.startDate, state.endDate)

  if (state.isLaunched) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-muted text-2xl text-primary">
          ✓
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-text-heading">Campaign Launched</h2>
          <p className="mt-2 text-secondary">
            {state.name || 'Your campaign'} is now active and ready for field execution.
          </p>
        </div>

        <div className="rounded-(--radius-card) border border-primary/30 bg-primary-muted/30 p-6 text-left">
          <p className="text-sm text-secondary">Campaign Status</p>
          <p className="mt-1 text-xl font-semibold text-primary">Active</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Campaign Ready
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-text-heading">Launch Campaign</h2>
        <p className="mt-2 text-secondary">
          Confirm the details below and launch your campaign.
        </p>
      </div>

      <dl className="space-y-4 rounded-(--radius-card) border border-border bg-surface-muted p-6">
        <div>
          <dt className="text-sm text-secondary">Campaign Name</dt>
          <dd className="mt-1 text-lg font-semibold text-text-heading">
            {state.name || '—'}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-secondary">Duration</dt>
          <dd className="mt-1 font-medium text-text-heading">{duration}</dd>
        </div>

        <div>
          <dt className="text-sm text-secondary">Campaign Team</dt>
          <dd className="mt-1 font-medium text-text-heading">
            {selectedRukns.length > 0
              ? selectedRukns.map((rukn) => rukn.name).join(', ')
              : '—'}
          </dd>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-secondary">Total Karkunan</dt>
            <dd className="mt-1 text-2xl font-semibold text-text-heading">
              {state.selectedKarkunIds.length}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-secondary">Total Connections</dt>
            <dd className="mt-1 text-2xl font-semibold text-text-heading">
              {totalAssignments}
            </dd>
          </div>
        </div>

        <div>
          <dt className="text-sm text-secondary">Campaign Status</dt>
          <dd className="mt-1 flex items-center gap-2 font-medium text-text-heading">
            <span className="rounded-full bg-surface-muted px-3 py-1 text-sm text-secondary">
              Draft
            </span>
            <span aria-hidden="true">→</span>
            <span className="rounded-full bg-primary-muted px-3 py-1 text-sm text-primary">
              Ready
            </span>
          </dd>
        </div>
      </dl>

      <PrimaryButton type="button" fullWidth onClick={onLaunch}>
        Launch Campaign
      </PrimaryButton>
    </div>
  )
}
