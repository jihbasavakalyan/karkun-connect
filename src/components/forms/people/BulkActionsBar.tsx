import { SecondaryButton } from '@/components/ui/SecondaryButton'

type BulkActionsBarProps = {
  selectedCount: number
  onActivate: () => void
  onDeactivate: () => void
  onUnassign?: () => void
  onClearSelection: () => void
}

export function BulkActionsBar({
  selectedCount,
  onActivate,
  onDeactivate,
  onUnassign,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-(--radius-card) border border-primary/20 bg-primary/5 p-3">
      <span className="text-sm font-medium text-text-heading">{selectedCount} selected</span>
      <SecondaryButton type="button" className="px-3 py-2 text-sm" onClick={onActivate}>
        Activate
      </SecondaryButton>
      <SecondaryButton type="button" className="px-3 py-2 text-sm" onClick={onDeactivate}>
        Deactivate
      </SecondaryButton>
      <SecondaryButton
        type="button"
        className="cursor-not-allowed px-3 py-2 text-sm opacity-60"
        disabled
        title="Coming in Version 2"
      >
        Bulk Assign (Coming in Version 2)
      </SecondaryButton>
      {onUnassign && (
        <SecondaryButton type="button" className="px-3 py-2 text-sm" onClick={onUnassign}>
          Unassign
        </SecondaryButton>
      )}
      <SecondaryButton type="button" className="px-3 py-2 text-sm" onClick={onClearSelection}>
        Clear
      </SecondaryButton>
    </div>
  )
}
