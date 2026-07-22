import { Link } from 'react-router-dom'
import { JourneyStageBadge } from '@/components/guidance'
import { EmptyState } from '@/components/ui'
import { useGuidance } from '@/hooks/useGuidance'
import { formatLastVisitLabel } from '@/lib/relationshipPresentation'
import { ruknCompanionPath } from '@/lib/ruknCommunicationNavigation'
import { ROUTES } from '@/constants/routes'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type MyConnectedKarkunsPanelProps = {
  ruknId: string
  karkuns: KarkunRegistryRecord[]
}

/**
 * KC-0091 — Person-first Connected Karkuns list for Rukn Communication.
 * Uses live connection data; COS fields (follow-up, etc.) use gentle placeholders.
 */
export function MyConnectedKarkunsPanel({ ruknId, karkuns }: MyConnectedKarkunsPanelProps) {
  const { getKarkunGuidance, version } = useGuidance(ruknId)
  void version

  if (karkuns.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="No Connected Karkuns yet"
        description="Connect with a Karkun to open relationship communication."
        primaryAction={{ label: 'Connect Karkun', href: ROUTES.RUKN_AVAILABLE_KARKUN }}
      />
    )
  }

  return (
    <section className="space-y-3" aria-label="My Connected Karkuns">
      <p className="text-sm text-secondary">
        {karkuns.length} Connected Karkun{karkuns.length === 1 ? '' : 's'} · tap to open Companion
        Workspace
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {karkuns.map((karkun) => {
          const guidance = getKarkunGuidance(karkun.id)
          const lastInteraction = formatLastVisitLabel(karkun.id) || 'No interaction recorded'
          return (
            <li key={karkun.id}>
              <Link
                to={ruknCompanionPath(karkun.id)}
                className="block rounded-(--radius-card) border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40 hover:bg-surface-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-text-heading">{karkun.name}</h3>
                  {guidance ? (
                    <JourneyStageBadge stageId={guidance.currentStage} variant="rukn" />
                  ) : null}
                </div>
                <dl className="mt-3 grid gap-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Current journey</dt>
                    <dd className="text-right font-medium text-text-heading">
                      {guidance?.stageLabel ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Last interaction</dt>
                    <dd className="text-right text-text-heading">{lastInteraction}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Next follow-up</dt>
                    <dd className="text-right text-text-heading">Placeholder</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Status</dt>
                    <dd className="text-right font-medium capitalize text-text-heading">
                      {karkun.status || guidance?.health?.level || 'active'}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
