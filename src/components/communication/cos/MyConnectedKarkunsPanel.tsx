/**
 * KC-0094 / KC-0097 — My Connected Karkuns relationship intelligence.
 * Presentation polish — same Matrix priority engine.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui'
import { Icon } from '@/components/ui/Icon'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import {
  buildMyConnectedKarkunsIntelligence,
  buildRecommendationNarrative,
  formatRelationshipStatusLabel,
} from '@/lib/communication/relationshipIntelligencePresentation'
import { ruknCompanionPath } from '@/lib/ruknCommunicationNavigation'
import { ROUTES } from '@/constants/routes'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type MyConnectedKarkunsPanelProps = {
  ruknId: string
  karkuns: KarkunRegistryRecord[]
}

function statusToneClass(status: string): string {
  switch (status) {
    case 'Needs Attention':
      return 'text-amber-800'
    case 'On Track':
    case 'Campaign Complete':
      return 'text-emerald-800'
    default:
      return 'text-text-heading'
  }
}

export function MyConnectedKarkunsPanel({ ruknId, karkuns }: MyConnectedKarkunsPanelProps) {
  const peopleVersion = usePeopleStore()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const a = subscribeToAnnexure1Store(() => setTick((v) => v + 1))
    const i = subscribeToIjtemaAttendanceStore(() => setTick((v) => v + 1))
    const b = subscribeToBaitulMaalStore(() => setTick((v) => v + 1))
    return () => {
      a()
      i()
      b()
    }
  }, [])

  void tick
  void peopleVersion

  const cards = useMemo(
    () => buildMyConnectedKarkunsIntelligence(ruknId, karkuns),
    [ruknId, karkuns, tick, peopleVersion],
  )

  const byId = useMemo(() => new Map(karkuns.map((k) => [k.id, k])), [karkuns])

  if (karkuns.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="No Connected Karkuns yet"
        description="Connect with a Karkun to begin relationship guidance."
        primaryAction={{ label: 'Connect Karkun', href: ROUTES.RUKN_AVAILABLE_KARKUN }}
      />
    )
  }

  const needingAttention = cards.filter((c) => c.pendingObjective !== 'None').length

  return (
    <section className="space-y-3" aria-label="My Connected Karkuns">
      <p className="text-sm leading-relaxed text-secondary">
        {needingAttention > 0
          ? `${needingAttention} need attention · ${cards.length} Connected`
          : `Excellent progress. ${cards.length} Connected · all campaign objectives on track`}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const karkun = byId.get(card.karkunId)
          const tel = karkun?.mobile ? buildTelLink(karkun.mobile) : null
          const whatsapp =
            karkun?.mobile || karkun?.whatsapp
              ? buildWhatsAppLink(
                  karkun.whatsapp?.trim() ? karkun.whatsapp : karkun.mobile,
                )
              : null
          const statusLabel = formatRelationshipStatusLabel(card.relationshipStatus)
          const narrative = buildRecommendationNarrative(card.karkunName, card.pendingObjective)
          const objectiveLabel =
            card.pendingObjective === 'None' ? 'Campaign Complete' : card.pendingObjective

          return (
            <li key={card.karkunId}>
              <article className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
                <h3 className="text-base font-semibold text-text-heading">{card.karkunName}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{narrative}</p>

                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Journey Stage</dt>
                    <dd className="text-right font-medium text-text-heading">{card.journeyStage}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Last Interaction</dt>
                    <dd className="text-right text-text-heading">
                      <span className="block">{card.lastInteractionLabel}</span>
                      {card.lastInteractionDateLabel ? (
                        <span className="text-xs text-secondary">
                          {card.lastInteractionDateLabel}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Suggested Action</dt>
                    <dd className="text-right font-medium text-primary">{card.nextAction}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Campaign Objective</dt>
                    <dd className="text-right font-medium text-text-heading">{objectiveLabel}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Relationship Status</dt>
                    <dd className={`text-right font-medium ${statusToneClass(statusLabel)}`}>
                      {statusLabel}
                    </dd>
                  </div>
                </dl>

                <div
                  className="mt-4 flex flex-wrap gap-2"
                  role="toolbar"
                  aria-label={`Actions for ${card.karkunName}`}
                >
                  {tel ? (
                    <a
                      href={tel}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-muted px-3 text-xs font-semibold text-text-heading hover:bg-surface"
                    >
                      <Icon name="phone" size="sm" />
                      Call
                    </a>
                  ) : (
                    <span className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-xs text-secondary">
                      Call unavailable
                    </span>
                  )}
                  {whatsapp ? (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-muted px-3 text-xs font-semibold text-text-heading hover:bg-surface"
                    >
                      <Icon name="message" size="sm" />
                      WhatsApp
                    </a>
                  ) : (
                    <span className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-xs text-secondary">
                      WhatsApp unavailable
                    </span>
                  )}
                  <Link
                    to={ruknCompanionPath(card.karkunId)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary-muted px-3 text-xs font-semibold text-primary hover:border-primary/50"
                  >
                    <Icon name="users" size="sm" />
                    Open Companion
                  </Link>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
