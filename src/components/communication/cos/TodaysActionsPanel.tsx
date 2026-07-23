/**
 * KC-0096 — Today's Actions (Follow-ups tab).
 * Outcome-driven list from Execution Matrix — no manual tasks or completion workflow.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { buildTodaysActionCards } from '@/lib/communication/relationshipIntelligencePresentation'
import { ruknCommunicationPath, ruknCompanionPath } from '@/lib/ruknCommunicationNavigation'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type TodaysActionsPanelProps = {
  ruknId: string
  karkuns: KarkunRegistryRecord[]
}

function priorityToneClass(priority: string): string {
  switch (priority) {
    case 'High':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'Medium':
      return 'border-sky-200 bg-sky-50 text-sky-900'
    default:
      return 'border-border bg-surface-muted text-secondary'
  }
}

export function TodaysActionsPanel({ ruknId, karkuns }: TodaysActionsPanelProps) {
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

  const actions = useMemo(
    () => buildTodaysActionCards(ruknId, karkuns),
    [ruknId, karkuns, tick, peopleVersion],
  )

  const byId = useMemo(() => new Map(karkuns.map((k) => [k.id, k])), [karkuns])

  if (karkuns.length === 0) {
    return (
      <section className="space-y-3" aria-label="Today's Actions">
        <h2 className="text-base font-semibold text-text-heading">Today&apos;s Actions</h2>
        <p className="text-sm text-secondary">
          Connect with a Karkun first — actions appear automatically from campaign progress.
        </p>
        <Link
          to={ruknCommunicationPath()}
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          My Connected Karkuns →
        </Link>
      </section>
    )
  }

  if (actions.length === 0) {
    return (
      <section
        className="rounded-(--radius-card) border border-emerald-200 bg-emerald-50/60 p-5 shadow-card"
        aria-label="Today's Actions"
      >
        <h2 className="text-base font-semibold text-emerald-900">Excellent!</h2>
        <p className="mt-2 text-sm text-emerald-900/90">
          All Connected Karkuns are currently progressing well.
        </p>
        <Link
          to={ruknCommunicationPath()}
          className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
        >
          My Connected Karkuns →
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-3" aria-label="Today's Actions">
      <div>
        <h2 className="text-base font-semibold text-text-heading">Today&apos;s Actions</h2>
        <p className="mt-1 text-sm text-secondary">
          {actions.length} Connected Karkun{actions.length === 1 ? '' : 's'} need attention —
          generated from campaign progress
        </p>
      </div>

      <ul className="grid gap-3">
        {actions.map((card) => {
          const karkun = byId.get(card.karkunId)
          const tel = karkun?.mobile ? buildTelLink(karkun.mobile) : null
          const whatsapp =
            karkun?.mobile || karkun?.whatsapp
              ? buildWhatsAppLink(
                  karkun.whatsapp?.trim() ? karkun.whatsapp : karkun.mobile,
                )
              : null

          return (
            <li key={card.karkunId}>
              <article className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-text-heading">{card.karkunName}</h3>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${priorityToneClass(card.priority)}`}
                  >
                    {card.priority}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Needs attention because
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm text-text-heading">
                    {card.whyLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Suggested Action</dt>
                    <dd className="text-right font-medium text-primary">{card.suggestedAction}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-secondary">Campaign Objective</dt>
                    <dd className="text-right font-medium text-text-heading">
                      {card.campaignObjective}
                    </dd>
                  </div>
                </dl>

                <div
                  className="mt-4 flex flex-wrap gap-2"
                  role="toolbar"
                  aria-label={`Actions for ${card.karkunName}`}
                >
                  <Link
                    to={ruknCompanionPath(card.karkunId)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary-muted px-3 text-xs font-semibold text-primary hover:border-primary/50"
                  >
                    <Icon name="users" size="sm" />
                    Open Companion
                  </Link>
                  {tel ? (
                    <a
                      href={tel}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-muted px-3 text-xs font-semibold text-text-heading hover:bg-surface"
                    >
                      <Icon name="phone" size="sm" />
                      Call
                    </a>
                  ) : null}
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
                  ) : null}
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
