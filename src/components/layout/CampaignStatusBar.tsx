import {
  formatActiveCampaignDuration,
  getActiveCampaignName,
  getCampaignTimeline,
} from '@/services/campaignService'
import { Icon } from '@/components/ui/Icon'

export function CampaignStatusBar() {
  const campaignName = getActiveCampaignName()
  const duration = formatActiveCampaignDuration()
  const timeline = getCampaignTimeline()
  const isActive = timeline?.status === 'active'

  return (
    <div
      className="border-b border-border bg-surface-muted px-4 py-2 text-center text-sm text-secondary"
      role="status"
      aria-label={
        isActive ? `Active campaign: ${campaignName}` : `Campaign: ${campaignName}`
      }
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
        <Icon name="pulse-healthy" size="sm" />
        {isActive ? 'Active Campaign:' : 'Campaign:'}{' '}
        <span className="font-medium text-text-heading">{campaignName}</span>
        {duration !== '—' ? <span className="text-xs">· {duration}</span> : null}
        {timeline?.status === 'completed' ? (
          <span className="text-xs">· {timeline.dayLabel}</span>
        ) : null}
      </span>
    </div>
  )
}

export function ActiveCampaignSubtitle() {
  const duration = formatActiveCampaignDuration()
  const timeline = getCampaignTimeline()
  const name = getActiveCampaignName()

  if (timeline?.status === 'completed') {
    return (
      <p className="mt-0.5 text-xs text-secondary">
        {name}
        {duration !== '—' ? ` · ${duration}` : ''}
        {' · '}
        {timeline.dayLabel}
      </p>
    )
  }

  if (timeline?.status !== 'active') {
    return <p className="mt-0.5 text-xs text-secondary">{name || 'No active campaign'}</p>
  }

  return (
    <p className="mt-0.5 text-xs text-secondary">
      {name}
      {duration !== '—' ? ` · ${duration}` : ''}
    </p>
  )
}
