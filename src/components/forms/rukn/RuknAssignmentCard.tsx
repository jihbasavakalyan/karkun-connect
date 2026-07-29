import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Rukn } from '@/data/ruknMaster'
import {
  adminAssignmentsPath,
  adminRuknDetailPath,
  ROUTES,
} from '@/constants/routes'
import { Icon } from '@/components/ui/Icon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  buildRuknWorkspacePending,
  getRuknLastCommunicationLabel,
  ruknWorkspaceStatus,
} from '@/lib/ruknWorkspacePresentation'

type RuknAssignmentCardProps = {
  rukn: Rukn
  onCommunicate: (rukn: Rukn) => void
}

function PendingRow({ label, value }: { label: string; value: number | null }) {
  const display = value === null ? '-' : String(value)
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-sm text-secondary">{label}</dt>
      <dd
        className={[
          'text-sm font-semibold tabular-nums',
          value !== null && value > 0 ? 'text-text-heading' : 'text-secondary',
        ].join(' ')}
      >
        {display}
      </dd>
    </div>
  )
}

export function RuknAssignmentCard({ rukn, onCommunicate }: RuknAssignmentCardProps) {
  const pending = buildRuknWorkspacePending(rukn.id)
  const status = ruknWorkspaceStatus(pending.completionPct, pending.connectedKarkuns)
  const lastCommunication = getRuknLastCommunicationLabel(rukn.id)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handlePointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  return (
    <article className="flex h-full flex-col rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-text-heading">{rukn.name}</h2>
          <p className="mt-0.5 text-xs text-secondary">{rukn.id}</p>
        </div>
        <StatusBadge variant={status.badgeVariant} className="shrink-0">
          <span aria-hidden="true">{status.icon}</span> {status.label}
        </StatusBadge>
      </header>

      <p className="mt-4 text-sm text-secondary">
        Connected Karkuns{' '}
        <span className="font-semibold tabular-nums text-text-heading">
          {pending.connectedKarkuns}
        </span>
      </p>

      <dl className="mt-3 space-y-0.5 border-t border-border pt-3">
        <PendingRow label="Pending Visits" value={pending.pendingVisits} />
        <PendingRow label="Pending Weekly Ijtema" value={pending.pendingWeeklyIjtema} />
        <PendingRow label="Pending Monthly Baitul Maal" value={pending.pendingMonthlyBaitulMaal} />
        <PendingRow label="Pending App Registration" value={pending.pendingAppRegistration} />
      </dl>

      <p className="mt-3 text-xs text-secondary">
        Last Communication · {lastCommunication ?? '-'}
      </p>

      <div className="mt-auto flex items-center gap-2 pt-5">
        <PrimaryButton
          type="button"
          className="min-w-0 flex-1 inline-flex items-center justify-center gap-2"
          onClick={() => onCommunicate(rukn)}
        >
          <Icon name="message" size="sm" />
          Communicate
        </PrimaryButton>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            aria-label={`More actions for ${rukn.name}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name="menu" size="sm" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute end-0 bottom-full z-20 mb-2 w-48 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-card"
            >
              <Link
                role="menuitem"
                to={adminRuknDetailPath(rukn.id)}
                className="block px-3 py-2 text-sm text-text-heading hover:bg-surface-muted"
                onClick={() => setMenuOpen(false)}
              >
                View Profile
              </Link>
              <Link
                role="menuitem"
                to={adminRuknDetailPath(rukn.id)}
                className="block px-3 py-2 text-sm text-text-heading hover:bg-surface-muted"
                onClick={() => setMenuOpen(false)}
              >
                View Connections
              </Link>
              <Link
                role="menuitem"
                to={adminAssignmentsPath({ ruknId: rukn.id, view: 'assign' })}
                className="block px-3 py-2 text-sm text-text-heading hover:bg-surface-muted"
                onClick={() => setMenuOpen(false)}
              >
                Assign Karkun
              </Link>
              <Link
                role="menuitem"
                to={ROUTES.ADMIN_COMMUNICATION_HISTORY}
                className="block px-3 py-2 text-sm text-text-heading hover:bg-surface-muted"
                onClick={() => setMenuOpen(false)}
              >
                History
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
