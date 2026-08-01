import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import {
  formatActiveCampaignDuration,
  getActiveCampaign,
  getActiveCampaignName,
  getActiveCampaignObjective,
  getActiveCampaignTheme,
  getCampaignTimeline,
} from '@/services/campaignService'
import { phoneCallStartedPolicy, genericExecutionPolicy } from '@/execution'
import {
  SettingsReadonly,
  SettingsRow,
  SettingsSection,
} from './SettingsPrimitives'

export function CampaignSettingsSection() {
  const campaign = getActiveCampaign()
  const timeline = getCampaignTimeline()
  const statusLabel = timeline?.status
    ? timeline.status.charAt(0).toUpperCase() + timeline.status.slice(1)
    : 'Unknown'

  return (
    <SettingsSection
      title="Campaign Settings"
      description="Campaign identity and default guidance. Execution stays in the Campaign module."
    >
      <SettingsRow label="Active Campaign">
        <SettingsReadonly value={getActiveCampaignName() || '—'} />
      </SettingsRow>
      <SettingsRow label="Campaign Dates">
        <SettingsReadonly value={formatActiveCampaignDuration() || '—'} />
      </SettingsRow>
      <SettingsRow label="Theme">
        <SettingsReadonly value={getActiveCampaignTheme() || '—'} />
      </SettingsRow>
      <SettingsRow label="Campaign Objectives">
        <SettingsReadonly value={getActiveCampaignObjective() || '—'} />
      </SettingsRow>
      <SettingsRow label="Campaign Status">
        <SettingsReadonly value={statusLabel} />
      </SettingsRow>
      <SettingsRow label="Default Rules" hint="Managed in Campaign Setup">
        <SettingsReadonly value={campaign ? 'Organisation defaults apply' : '—'} />
      </SettingsRow>
      <SettingsRow label="Automation Policies" hint="Read-only foundation from KC-020">
        <SettingsReadonly
          value={`${phoneCallStartedPolicy.policyId}, ${genericExecutionPolicy.policyId}`}
        />
      </SettingsRow>
      <p className="text-sm text-secondary">
        To change campaign configuration, open{' '}
        <Link className="font-medium text-primary hover:underline" to={ROUTES.ADMIN_CAMPAIGN}>
          Campaign
        </Link>
        . No execution controls are available here.
      </p>
    </SettingsSection>
  )
}
