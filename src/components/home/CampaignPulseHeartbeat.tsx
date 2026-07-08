import type { CampaignPulse } from '@/lib/campaignPulsePresentation'

type CampaignPulseHeartbeatProps = {
  pulse: CampaignPulse
  variant?: 'hero' | 'inline'
}

const LEVEL_CLASS: Record<CampaignPulse['level'], string> = {
  healthy: 'cd-pulse-healthy',
  'needs-attention': 'cd-pulse-attention',
  critical: 'cd-pulse-critical',
}

export function CampaignPulseHeartbeat({
  pulse,
  variant = 'inline',
}: CampaignPulseHeartbeatProps) {
  return (
    <div
      className={`cd-pulse ${LEVEL_CLASS[pulse.level]} ${variant === 'hero' ? 'cd-pulse-hero' : ''}`}
      role="status"
      aria-label={`Campaign pulse: ${pulse.label}`}
    >
      <div className="cd-pulse-header">
        <span className="cd-pulse-icon" aria-hidden="true">
          <span className="cd-pulse-dot">{pulse.icon}</span>
          <span className="cd-pulse-ring" />
        </span>
        <div>
          <p className="cd-pulse-label">Campaign Pulse</p>
          <p className="cd-pulse-status">{pulse.label}</p>
        </div>
      </div>
      <ul className="cd-pulse-trends">
        {pulse.signals.map((signal) => (
          <li key={signal}>{signal}</li>
        ))}
      </ul>
    </div>
  )
}
