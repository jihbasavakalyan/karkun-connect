import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Icon } from '@/components/ui/Icon'

type RelationshipActionBarProps = {
  onConnect?: () => void
  onRequestReview?: () => void
  showConnect?: boolean
  showRequestReview?: boolean
  connectDisabled?: boolean
  requestReviewDisabled?: boolean
  compact?: boolean
}

export function RelationshipActionBar({
  onConnect,
  onRequestReview,
  showConnect = false,
  showRequestReview = false,
  connectDisabled = false,
  requestReviewDisabled = false,
  compact = false,
}: RelationshipActionBarProps) {
  const hasActions = showConnect || showRequestReview
  if (!hasActions) {
    return null
  }

  const buttonClass = compact ? 'min-h-11 px-3 py-2 text-sm' : 'min-h-12'

  return (
    <div
      className={`relationship-action-bar ${compact ? 'relationship-action-bar-compact' : ''}`}
      role="toolbar"
      aria-label="Relationship actions"
    >
      {showConnect && onConnect && (
        <PrimaryButton
          type="button"
          className={buttonClass}
          disabled={connectDisabled}
          onClick={onConnect}
        >
          <Icon name="plus" size="sm" />
          Connect
        </PrimaryButton>
      )}
      {showRequestReview && onRequestReview && (
        <SecondaryButton
          type="button"
          className={buttonClass}
          disabled={requestReviewDisabled}
          onClick={onRequestReview}
        >
          <Icon name="flag" size="sm" />
          Request Review
        </SecondaryButton>
      )}
    </div>
  )
}
