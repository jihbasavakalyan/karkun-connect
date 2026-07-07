import { SecondaryButton } from '@/components/ui/SecondaryButton'

type BulkActionsBarProps = {
  selectedCount: number
  onActivate: () => void
  onDeactivate: () => void
  onUnassign?: () => void
  onMarkBaitulMaalPaid?: () => void
  onMarkBaitulMaalPending?: () => void
  onClearSelection: () => void
}

export function BulkActionsBar({
  selectedCount,
  onActivate,
  onDeactivate,
  onUnassign,
  onMarkBaitulMaalPaid,
  onMarkBaitulMaalPending,
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
      {onMarkBaitulMaalPaid && (
        <SecondaryButton type="button" className="px-3 py-2 text-sm" onClick={onMarkBaitulMaalPaid}>
          Mark Bait-ul-Maal Paid
        </SecondaryButton>
      )}
      {onMarkBaitulMaalPending && (
        <SecondaryButton
          type="button"
          className="px-3 py-2 text-sm"
          onClick={onMarkBaitulMaalPending}
        >
          Mark Bait-ul-Maal Pending
        </SecondaryButton>
      )}
      <SecondaryButton type="button" className="px-3 py-2 text-sm" onClick={onClearSelection}>
        Clear
      </SecondaryButton>
    </div>
  )
}
