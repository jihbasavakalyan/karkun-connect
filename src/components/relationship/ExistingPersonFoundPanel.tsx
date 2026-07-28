/**
 * KC-BUG-0124 — Shared Existing Person Found panel (relationship graph).
 */

import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import type { MobileDuplicateDetails } from '@/services/karkunRequestService'

type ExistingPersonFoundPanelProps = {
  duplicate: MobileDuplicateDetails
  /** Prefer admin profile links when shown in Admin surfaces. */
  preferAdminLinks?: boolean
}

export function ExistingPersonFoundPanel({
  duplicate,
  preferAdminLinks = false,
}: ExistingPersonFoundPanelProps) {
  const profileHref = preferAdminLinks ? duplicate.adminViewRoute : duplicate.viewRoute
  const journeyHref = duplicate.journeyRoute ?? duplicate.viewRoute
  const connectionHref = preferAdminLinks
    ? (duplicate.connectionRoute ?? ROUTES.ADMIN_ASSIGNMENTS)
    : duplicate.connectRoute

  return (
    <div className="mt-3 space-y-1 text-sm">
      <p className="font-semibold">Existing Person Found</p>
      {duplicate.lookupFailedStep ? (
        <p className="text-amber-900">
          Lookup incomplete at step: {duplicate.lookupFailedStep}
        </p>
      ) : null}
      <p>
        <span className="font-medium">Person ID: </span>
        {duplicate.karkunId}
      </p>
      <p>
        <span className="font-medium">Name: </span>
        {duplicate.name}
      </p>
      <p>
        <span className="font-medium">Mobile: </span>
        {duplicate.mobile}
      </p>
      <p>
        <span className="font-medium">Registry: </span>
        {duplicate.category || '—'}
      </p>
      <p>
        <span className="font-medium">Responsible Rukn: </span>
        {duplicate.connectedToRuknName || duplicate.connectedToRuknId || '—'}
      </p>
      <p>
        <span className="font-medium">Attached Connection: </span>
        {duplicate.attachedConnectionId ||
          duplicate.assignmentNumber ||
          duplicate.assignmentId ||
          '—'}
      </p>
      <p>
        <span className="font-medium">Connected Since: </span>
        {duplicate.connectedSince || '—'}
      </p>
      <p>
        <span className="font-medium">Campaign Status: </span>
        {duplicate.campaignStatus || '—'}
      </p>
      <p>
        <span className="font-medium">Ward: </span>
        {duplicate.ward || '—'}
      </p>
      <p>
        <span className="font-medium">Area: </span>
        {duplicate.area || '—'}
      </p>
      <p>
        <span className="font-medium">Status: </span>
        {duplicate.connectionStatus ||
          [duplicate.status, duplicate.assignmentStatus].filter(Boolean).join(' · ') ||
          '—'}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Link to={profileHref} className="font-semibold text-primary underline">
          Open Person Profile
        </Link>
        <Link to={connectionHref} className="font-semibold text-primary underline">
          Open Connection
        </Link>
        <Link to={journeyHref} className="font-semibold text-primary underline">
          View Campaign Journey
        </Link>
        {duplicate.eligibleToConnect ? (
          <Link to={duplicate.connectRoute} className="font-semibold text-primary underline">
            Connect Existing
          </Link>
        ) : null}
        <span className="text-xs text-secondary">Request Transfer (coming soon)</span>
      </div>
    </div>
  )
}
