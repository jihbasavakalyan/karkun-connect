/**
 * KC-0053 — Single Connected Karkuns card for Admin Connection Desk.
 * Replaces the duplicate "Current Connections" timeline block for actives.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { adminAnnexure1Path } from '@/constants/routes'
import { formatLastVisitLabel } from '@/lib/relationshipPresentation'
import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import type { AssignmentRecord } from '@/types/assignment'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type ConnectedAssignmentDeskCardProps = {
  assignment: AssignmentRecord
  onTransfer: (karkun: { id: string; name: string }) => void
  onDisconnect: (karkun: { id: string; name: string }) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ConnectedAssignmentDeskCard({
  assignment,
  onTransfer,
  onDisconnect,
}: ConnectedAssignmentDeskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const karkun = getKarkunById(assignment.karkunId)
  const name = karkun?.name ?? assignment.karkunId
  const followUp = getActiveFollowUpForKarkun(assignment.karkunId)
  const lastVisit = formatLastVisitLabel(assignment.karkunId)
  const nextFollowUp = followUp
    ? `${followUp.followUpDate}${followUp.purpose ? ` · ${followUp.purpose}` : ''}`
    : 'None scheduled'
  const status = assignment.status === 'Active' ? 'Connected' : assignment.status

  return (
    <li className="rounded-lg border border-border bg-surface-muted px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-heading">{name}</p>
          <dl className="mt-1 grid gap-0.5 text-xs text-secondary sm:grid-cols-2">
            <div>
              <dt className="inline font-medium text-text-heading">Connection ID: </dt>
              <dd className="inline">{assignment.assignmentNumber}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-text-heading">Connected since: </dt>
              <dd className="inline">{formatDate(assignment.effectiveFrom)}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-text-heading">Last visit: </dt>
              <dd className="inline">{lastVisit}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-text-heading">Next follow-up: </dt>
              <dd className="inline">{nextFollowUp}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-text-heading">Status: </dt>
              <dd className="inline">{status}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton
            type="button"
            className="px-3 py-1.5 text-sm"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? 'Hide details' : 'Open Connection'}
          </SecondaryButton>
          <SecondaryButton
            type="button"
            className="px-3 py-1.5 text-sm"
            onClick={() => onTransfer({ id: assignment.karkunId, name })}
          >
            Transfer
          </SecondaryButton>
          <SecondaryButton
            type="button"
            className="px-3 py-1.5 text-sm"
            onClick={() => onDisconnect({ id: assignment.karkunId, name })}
          >
            Disconnect
          </SecondaryButton>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 rounded-md border border-border/70 bg-surface px-3 py-2 text-sm text-secondary">
          <p>
            <span className="font-medium text-text-heading">Assignment ID: </span>
            {assignment.assignmentId}
          </p>
          <p className="mt-1">
            <span className="font-medium text-text-heading">Created by: </span>
            {assignment.assignedBy}
          </p>
          {assignment.remarks ? (
            <p className="mt-1">
              <span className="font-medium text-text-heading">Remarks: </span>
              {assignment.remarks}
            </p>
          ) : null}
          <p className="mt-2">
            <Link
              to={adminAnnexure1Path(assignment.karkunId)}
              className="font-semibold text-primary hover:underline"
            >
              Open full connection workspace →
            </Link>
          </p>
        </div>
      ) : null}
    </li>
  )
}
