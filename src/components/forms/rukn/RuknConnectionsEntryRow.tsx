import { Link } from 'react-router-dom'
import type { Rukn } from '@/data/ruknMaster'
import { adminAssignmentsPath, adminRuknDetailPath } from '@/constants/routes'
import { getRuknAssignmentSummary } from '@/services/assignmentService'
import { getConnectedMuttafiqDisplayRowsForRukn } from '@/stores/muttafiqRelationshipStore'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { UI_LABELS } from '@/lib/uiTerminology'

type RuknConnectionsEntryRowProps = {
  rukn: Rukn
  onCommunicate: (rukn: Rukn) => void
}

/** Compact Rufaqa entry into canonical باہمی ربط — not a third Connections desk. */
export function RuknConnectionsEntryRow({ rukn, onCommunicate }: RuknConnectionsEntryRowProps) {
  const summary = getRuknAssignmentSummary(rukn.id)
  const muttafiqCount = getConnectedMuttafiqDisplayRowsForRukn(rukn.id).length

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-text-heading">{rukn.name}</p>
        <p className="mt-0.5 text-sm text-secondary">
          {rukn.id} · {summary.assignedKarkunCount} Karkun
          {muttafiqCount > 0 ? ` · ${muttafiqCount} ${UI_LABELS.connectedMuttafiqeen}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={adminAssignmentsPath({ ruknId: rukn.id, view: 'manage' })}
          className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
        >
          Open باہمی ربط
        </Link>
        <Link
          to={`${adminRuknDetailPath(rukn.id)}?tab=connections`}
          className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-heading"
        >
          Detail
        </Link>
        <SecondaryButton
          type="button"
          className="min-h-10 px-3 py-2 text-sm"
          onClick={() => onCommunicate(rukn)}
        >
          WhatsApp
        </SecondaryButton>
      </div>
    </li>
  )
}
