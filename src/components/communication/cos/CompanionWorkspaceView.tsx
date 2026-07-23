/**
 * KC-0095 — Companion Workspace for one Connected Karkun.
 * Mission-oriented relationship view — no messaging, no new storage.
 */

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { buildCompanionWorkspaceModel } from '@/lib/communication/relationshipIntelligencePresentation'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { RAFEEQ_BRAND } from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type CompanionWorkspaceViewProps = {
  ruknId: string
  karkun: KarkunRegistryRecord
}

function statusToneClass(status: string): string {
  switch (status) {
    case 'Needs Visit':
    case 'Needs Follow-up':
      return 'text-amber-800'
    case 'High Engagement':
    case 'Campaign Complete':
      return 'text-emerald-800'
    default:
      return 'text-text-heading'
  }
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

export function CompanionWorkspaceView({ ruknId, karkun }: CompanionWorkspaceViewProps) {
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

  const model = useMemo(
    () => buildCompanionWorkspaceModel(ruknId, karkun),
    [ruknId, karkun, tick, peopleVersion],
  )

  const { intelligence, objectives, activities, recommendation, rafeeqGuidance } = model
  const tel = karkun.mobile ? buildTelLink(karkun.mobile) : null
  const whatsapp =
    karkun.mobile || karkun.whatsapp
      ? buildWhatsAppLink(karkun.whatsapp?.trim() ? karkun.whatsapp : karkun.mobile)
      : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <section
        className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
        aria-label="Companion header"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Companion Workspace
        </p>
        <h1 className="mt-1 text-xl font-semibold text-text-heading">{karkun.name}</h1>
        {karkun.mobile ? (
          <p className="mt-1 text-sm text-secondary">{karkun.mobile}</p>
        ) : (
          <p className="mt-1 text-sm text-secondary">No phone on record</p>
        )}

        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Journey Stage</dt>
            <dd className="font-medium text-text-heading">{intelligence.journeyStage}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Relationship Status</dt>
            <dd className={`font-medium ${statusToneClass(intelligence.relationshipStatus)}`}>
              {intelligence.relationshipStatus}
            </dd>
          </div>
        </dl>

        <div
          className="mt-4 flex flex-wrap gap-2"
          role="toolbar"
          aria-label={`Quick actions for ${karkun.name}`}
        >
          {tel ? (
            <a
              href={tel}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-muted px-3 text-xs font-semibold text-text-heading hover:bg-surface"
            >
              <Icon name="phone" size="sm" />
              Call
            </a>
          ) : (
            <span className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 text-xs text-secondary">
              Call unavailable
            </span>
          )}
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-muted px-3 text-xs font-semibold text-text-heading hover:bg-surface"
            >
              <Icon name="message" size="sm" />
              WhatsApp
            </a>
          ) : (
            <span className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 text-xs text-secondary">
              WhatsApp unavailable
            </span>
          )}
          <button
            type="button"
            disabled
            title="Record Visit will be available in a future release"
            className="inline-flex min-h-11 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-xs font-semibold text-secondary opacity-80"
          >
            <Icon name="file-text" size="sm" />
            Record Visit
          </button>
        </div>
        <p className="mt-2 text-[11px] text-secondary">Record Visit is a placeholder in this phase.</p>
      </section>

      {/* Campaign Progress — read-only */}
      <section
        className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
        aria-label="Campaign progress"
      >
        <h2 className="text-sm font-semibold text-text-heading">Campaign Progress</h2>
        <p className="mt-1 text-xs text-secondary">
          Read-only overview · edit in Execution Matrix
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {objectives.map((objective) => (
            <li
              key={objective.id}
              className={`rounded-lg border px-3 py-2.5 ${
                objective.completed
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-border bg-surface-muted'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-text-heading">{objective.label}</span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    objective.completed ? 'text-emerald-800' : 'text-secondary'
                  }`}
                >
                  {objective.completed ? 'Done' : 'Pending'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-secondary">{objective.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Latest Activity */}
      <section
        className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
        aria-label="Latest activity"
      >
        <h2 className="text-sm font-semibold text-text-heading">Latest Activity</h2>
        {activities.length === 0 ? (
          <p className="mt-2 text-sm text-secondary">No meaningful activity recorded yet.</p>
        ) : (
          <ol className="mt-3 divide-y divide-border">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium text-text-heading">{activity.label}</span>
                <span className="shrink-0 text-xs text-secondary">{activity.dateLabel}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Next Recommended Action */}
      <section
        className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
        aria-label="Next recommended action"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-heading">Next Recommended Action</h2>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${priorityToneClass(recommendation.priority)}`}
          >
            {recommendation.priority} priority
          </span>
        </div>
        <p className="mt-3 text-base font-semibold text-primary">{recommendation.action}</p>
        <p className="mt-1 text-sm text-secondary">{recommendation.reason}</p>
        {recommendation.pendingObjective !== 'None' ? (
          <p className="mt-2 text-xs text-secondary">
            Pending objective: {recommendation.pendingObjective}
          </p>
        ) : null}
      </section>

      {/* Notes — placeholder */}
      <section
        className="rounded-(--radius-card) border border-dashed border-border bg-surface p-4 sm:p-5"
        aria-label="Notes"
      >
        <h2 className="text-sm font-semibold text-text-heading">Notes</h2>
        <p className="mt-2 text-sm text-secondary">
          Notes will be available in a future release.
        </p>
      </section>

      {/* Relationship Timeline — placeholder */}
      <section
        className="rounded-(--radius-card) border border-dashed border-border bg-surface p-4 sm:p-5"
        aria-label="Relationship timeline"
      >
        <h2 className="text-sm font-semibold text-text-heading">Relationship Timeline</h2>
        <p className="mt-2 text-sm text-secondary">
          Relationship timeline will be available in a future release.
        </p>
      </section>

      {/* Digital Rafeeq — contextual */}
      <section
        className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
        aria-label={RAFEEQ_BRAND}
      >
        <p className="text-[11px] font-medium uppercase tracking-wide text-secondary">
          {RAFEEQ_BRAND}
        </p>
        <h2 className="mt-1 text-sm font-semibold text-text-heading">Guidance for this Karkun</h2>
        <p className="mt-2 text-sm text-text-heading urdu-text" dir="rtl" lang="ur">
          {rafeeqGuidance}
        </p>
      </section>
    </div>
  )
}
