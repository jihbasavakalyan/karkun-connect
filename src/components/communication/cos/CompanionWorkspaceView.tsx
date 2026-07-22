import { CosPlaceholderPanel } from '@/components/communication/cos/CosPlaceholderPanel'
import { DigitalRafeeqGuidancePanel } from '@/components/communication/cos/DigitalRafeeqGuidancePanel'
import { JourneyStageBadge, RelationshipHealthBadge } from '@/components/guidance'
import { formatLastVisitLabel } from '@/lib/relationshipPresentation'
import type { KarkunGuidance } from '@/types/guidance'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type CompanionWorkspaceViewProps = {
  karkun: KarkunRegistryRecord
  guidance: KarkunGuidance | null
}

/**
 * KC-0091 — Placeholder Companion Workspace for one Connected Karkun.
 * No messaging, persistence, or delivery.
 */
export function CompanionWorkspaceView({ karkun, guidance }: CompanionWorkspaceViewProps) {
  const lastInteraction = formatLastVisitLabel(karkun.id) || 'No interaction recorded'

  return (
    <div className="space-y-4">
      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Relationship summary
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-text-heading">{karkun.name}</h2>
          {guidance ? (
            <JourneyStageBadge stageId={guidance.currentStage} variant="rukn" />
          ) : null}
          {guidance?.health ? (
            <RelationshipHealthBadge health={guidance.health} stageId={guidance.currentStage} />
          ) : null}
        </div>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-secondary">Area</dt>
            <dd className="font-medium text-text-heading">{karkun.area || '—'}</dd>
          </div>
          <div>
            <dt className="text-secondary">Last interaction</dt>
            <dd className="font-medium text-text-heading">{lastInteraction}</dd>
          </div>
          <div>
            <dt className="text-secondary">Journey</dt>
            <dd className="font-medium text-text-heading">{guidance?.stageLabel ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-secondary">Next action</dt>
            <dd className="font-medium text-text-heading">
              {guidance?.nextAction?.label ?? 'Placeholder'}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <CosPlaceholderPanel
          title="Conversation Timeline"
          description="Relationship messages and notes will appear here. No messaging in this sprint."
        />
        <CosPlaceholderPanel
          title="Visit Timeline"
          description="Visit history and planned visits will appear here."
        />
        <CosPlaceholderPanel
          title="Follow-ups"
          description="Promised next steps for this Connected Karkun."
        >
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-secondary">
            No follow-ups configured yet (placeholder).
          </p>
        </CosPlaceholderPanel>
        <CosPlaceholderPanel
          title="Notes"
          description="Personal notes that support service continuity."
        >
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-secondary">
            Notes are not persisted in KC-0091.
          </p>
        </CosPlaceholderPanel>
        <CosPlaceholderPanel
          title="Shared Resources"
          description="Materials shared in support of the journey."
        />
        <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
          <DigitalRafeeqGuidancePanel compact title="Digital Rafeeq Suggestions" />
        </div>
      </div>
    </div>
  )
}
