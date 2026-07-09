import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Icon } from '@/components/ui/Icon'

type RelationshipActionBarProps = {
  onConnect?: () => void
  onReplace?: () => void
  onRelease?: () => void
  showConnect?: boolean
  showReplace?: boolean
  showRelease?: boolean
  connectDisabled?: boolean
  compact?: boolean
}

export function RelationshipActionBar({
  onConnect,
  onReplace,
  onRelease,
  showConnect = false,
  showReplace = false,
  showRelease = false,
  connectDisabled = false,
  compact = false,
}: RelationshipActionBarProps) {
  const hasActions = showConnect || showReplace || showRelease
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
      {showReplace && onReplace && (
        <SecondaryButton type="button" className={buttonClass} onClick={onReplace}>
          <Icon name="refresh" size="sm" />
          Replace
        </SecondaryButton>
      )}
      {showRelease && onRelease && (
        <SecondaryButton type="button" className={buttonClass} onClick={onRelease}>
          <Icon name="x" size="sm" />
          Release
        </SecondaryButton>
      )}
    </div>
  )
}
