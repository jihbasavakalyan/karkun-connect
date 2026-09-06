/**
 * Read-only Muttafiq ↔ Rukn counterpart row (Rukn detail / Muttafiq profile).
 */

import { Link } from 'react-router-dom'
import type { MuttafiqRuknConnectionDisplayRow } from '@/lib/connections/muttafiqRelationshipDisplay'
import { StatusBadge } from '@/components/ui/StatusBadge'

type MuttafiqRuknConnectionRowProps = {
  row: MuttafiqRuknConnectionDisplayRow
}

function rowClassName(visual: MuttafiqRuknConnectionDisplayRow['visual']): string {
  if (visual === 'muttafiq') {
    return 'rounded-lg border border-amber-400/55 bg-amber-500/20 px-3 py-3 hover:border-amber-300/70 hover:bg-amber-500/25'
  }
  return 'rounded-lg border border-primary/45 bg-primary/15 px-3 py-3 hover:border-primary/60 hover:bg-primary/22'
}

export function MuttafiqRuknConnectionRow({ row }: MuttafiqRuknConnectionRowProps) {
  return (
    <li className={rowClassName(row.visual)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={
              row.visual === 'muttafiq'
                ? 'flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-400/25 text-sm font-semibold text-amber-950'
                : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary'
            }
            aria-hidden
          >
            {row.initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-text-heading">{row.counterpartName}</p>
            <p className="mt-0.5 text-sm text-secondary">{row.counterpartIdentifier}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge variant={row.visual === 'muttafiq' ? 'warning' : 'info'}>
                {row.categoryLabel}
              </StatusBadge>
              <StatusBadge variant="connected">{row.statusLabel}</StatusBadge>
            </div>
            {row.missing ? (
              <p className="mt-2 text-sm text-secondary">
                Relationship {row.relationshipId} · counterpart {row.counterpartId}
              </p>
            ) : null}
          </div>
        </div>
        {row.profileHref ? (
          <Link
            to={row.profileHref}
            className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-heading hover:bg-surface-muted"
          >
            View
          </Link>
        ) : null}
      </div>
    </li>
  )
}
