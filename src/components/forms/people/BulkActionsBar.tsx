import { SecondaryButton } from '@/components/ui/SecondaryButton'

type BulkActionsBarProps = {
  selectedCount: number
  onActivate: () => void
  onDeactivate: () => void
  onUnassign?: () => void
  onMarkBaitulMaalPaid?: () => void
  onMarkBaitulMaalPending?: () => void
  onMarkIjtemaPresent?: () => void
  onMarkIjtemaAbsent?: () => void
  onMarkIjtemaInformed?: () => void
  onMarkJihRegistered?: () => void
  onMarkJihNotRegistered?: () => void
  onMarkJihReportSubmitted?: () => void
  onMarkJihReportPending?: () => void
  onSendWhatsApp?: () => void
  onClearSelection: () => void
}

export function BulkActionsBar({
  selectedCount,
  onActivate,
  onDeactivate,
  onUnassign,
  onMarkBaitulMaalPaid,
  onMarkBaitulMaalPending,
  onMarkIjtemaPresent,
  onMarkIjtemaAbsent,
  onMarkIjtemaInformed,
  onMarkJihRegistered,
  onMarkJihNotRegistered,
  onMarkJihReportSubmitted,
  onMarkJihReportPending,
  onSendWhatsApp,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-(--radius-card) border border-primary/20 bg-primary/5 p-3">
      <span className="text-sm font-medium text-text-heading">{selectedCount} selected</span>
      <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onActivate}>
        Activate
      </SecondaryButton>
      <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onDeactivate}>
        Deactivate
      </SecondaryButton>
      <SecondaryButton
        type="button"
        className="min-h-10 cursor-not-allowed px-3 py-2 text-sm opacity-60"
        disabled
        title="Coming in Version 2"
      >
        Bulk Connect (Coming in Version 2)
      </SecondaryButton>
      {onUnassign && (
        <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onUnassign}>
          Disconnect
        </SecondaryButton>
      )}
      {onMarkBaitulMaalPaid && (
        <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onMarkBaitulMaalPaid}>
          Mark Bait-ul-Maal Paid
        </SecondaryButton>
      )}
      {onMarkBaitulMaalPending && (
        <SecondaryButton
          type="button"
          className="min-h-10 px-3 py-2 text-sm"
          onClick={onMarkBaitulMaalPending}
        >
          Mark Bait-ul-Maal Pending
        </SecondaryButton>
      )}
      {onMarkIjtemaPresent && (
        <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onMarkIjtemaPresent}>
          Mark Ijtema Present
        </SecondaryButton>
      )}
      {onMarkIjtemaAbsent && (
        <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onMarkIjtemaAbsent}>
          Mark Ijtema Absent
        </SecondaryButton>
      )}
      {onMarkIjtemaInformed && (
        <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onMarkIjtemaInformed}>
          Mark Ijtema Excused
        </SecondaryButton>
      )}
      {onMarkJihRegistered && (
        <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onMarkJihRegistered}>
          Mark JIH Registered
        </SecondaryButton>
      )}
      {onMarkJihNotRegistered && (
        <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onMarkJihNotRegistered}>
          Mark JIH Not Registered
        </SecondaryButton>
      )}
      {onMarkJihReportSubmitted && (
        <SecondaryButton
          type="button"
          className="min-h-10 px-3 py-2 text-sm"
          onClick={onMarkJihReportSubmitted}
        >
          Mark Report Submitted
        </SecondaryButton>
      )}
      {onMarkJihReportPending && (
        <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onMarkJihReportPending}>
          Mark Report Pending
        </SecondaryButton>
      )}
      {onSendWhatsApp && (
        <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onSendWhatsApp}>
          Send WhatsApp
        </SecondaryButton>
      )}
      <SecondaryButton type="button" className="min-h-10 px-3 py-2 text-sm" onClick={onClearSelection}>
        Clear
      </SecondaryButton>
    </div>
  )
}
