/**
 * KC-0124 / KC-0126 — Person context on identity detail (campaign / timeline / comms).
 * Presentation only — presentPerson360Profile aggregators unchanged.
 */

import { Link } from 'react-router-dom'
import { buildPerson360Profile } from '@/lib/personProfile'
import { ContinuousKarkunJourneyStrip } from '@/components/journey/ContinuousKarkunJourneyStrip'
import { UI_LABELS } from '@/lib/uiTerminology'
import { useMuttafiqRelationshipStore } from '@/hooks/useMuttafiqRelationshipStore'
import { MuttafiqRuknConnectionRow } from '@/components/relationship/MuttafiqRuknConnectionRow'
import { isCampaignPeriodActive } from '@/services/campaignService'

type Person360OverviewProps = {
  personId: string
  /** Parent already shows Muttafiq relationship — keep aggregator, skip duplicate UI. */
  omitRelationship?: boolean
}

function toneClass(tone: 'ok' | 'pending' | 'neutral'): string {
  if (tone === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (tone === 'pending') return 'border-amber-200 bg-amber-50 text-amber-950'
  return 'border-border bg-surface-muted text-text-heading'
}

export function Person360Overview({ personId, omitRelationship = false }: Person360OverviewProps) {
  const relationshipVersion = useMuttafiqRelationshipStore()
  void relationshipVersion
  const profile = buildPerson360Profile(personId)
  if (!profile.found) return null

  const campaignPeriodActive = isCampaignPeriodActive()
  const {
    campaignStatus,
    journeyStages,
    continuousJourney,
    timeline,
    communications,
    quickActions,
    relationshipDisplay,
    removed,
  } = profile

  const contextualLinks = quickActions.filter((action) => action.kind === 'link' && action.href)

  return (
    <div className="person-360 space-y-6">
      {contextualLinks.length > 0 ? (
        <nav className="kc-person-detail-related" aria-label="Related destinations">
          {contextualLinks.map((action) => (
            <Link key={action.id} to={action.href!} className="kc-person-detail-related-link">
              {action.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {!omitRelationship && relationshipDisplay ? (
        <section>
          <h3 className="kc-person-detail-section-title">
            {relationshipDisplay.title}
            {relationshipDisplay.status === 'one' ? ` (${relationshipDisplay.activeCount})` : ''}
          </h3>
          {relationshipDisplay.row ? (
            <ul className="mt-3 space-y-2">
              <MuttafiqRuknConnectionRow row={relationshipDisplay.row} />
            </ul>
          ) : relationshipDisplay.status === 'duplicate' ? (
            <p className="mt-3 text-sm text-secondary" role="status">
              {relationshipDisplay.emptyLabel}
              {relationshipDisplay.diagnosticRuknIds.length > 0
                ? ` · ${relationshipDisplay.diagnosticRuknIds.join(', ')}`
                : ''}
            </p>
          ) : (
            <p className="mt-3 text-sm text-secondary">{relationshipDisplay.emptyLabel}</p>
          )}
        </section>
      ) : null}

      {removed ? (
        <p className="text-sm text-secondary">
          {removed.relationshipHistoryPreserved
            ? 'Historical records remain available below. Relationship documents were not rewritten.'
            : 'Historical information remains available below.'}
        </p>
      ) : null}

      {!removed && campaignPeriodActive ? (
        <section>
          <h3 className="kc-person-detail-section-title">{UI_LABELS.campaignSituation}</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {campaignStatus.map((item) => (
              <li
                key={item.id}
                className={`rounded-lg border px-3 py-2 text-sm ${toneClass(item.tone)}`}
              >
                <p className="font-semibold">{item.label}</p>
                <p className="mt-0.5 opacity-90">{item.value}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!removed && campaignPeriodActive ? (
        <section>
          <h3 className="kc-person-detail-section-title">Campaign Journey</h3>
          <ol className="mt-3 flex flex-wrap gap-2">
            {journeyStages.map((stage) => (
              <li
                key={stage.id}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-semibold',
                  stage.current
                    ? 'border-primary bg-primary/10 text-primary'
                    : stage.complete
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-border text-secondary',
                ].join(' ')}
              >
                {stage.label}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {continuousJourney ? (
        <section>
          <ContinuousKarkunJourneyStrip snapshot={continuousJourney} />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="kc-person-detail-section-title">Timeline</h3>
          <p className="mt-1 text-xs text-secondary">Newest first</p>
          {timeline.length === 0 ? (
            <p className="mt-3 text-sm text-secondary">No timeline events yet.</p>
          ) : (
            <ul className="person-360-timeline mt-3 max-h-80 space-y-3 overflow-y-auto pe-1">
              {timeline.slice(0, 25).map((row) => (
                <li key={row.id} className="border-b border-border/60 pb-3 text-sm last:border-0">
                  <p className="font-medium text-text-heading">{row.activity}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {row.date}
                    {row.actor ? ` · ${row.actor}` : ''}
                    {row.module ? ` · ${row.module}` : ''}
                  </p>
                  {row.status ? <p className="mt-1 text-secondary">{row.status}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="kc-person-detail-section-title">Communication history</h3>
          {communications.length === 0 ? (
            <p className="mt-3 text-sm text-secondary">No communication history yet.</p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto pe-1">
              {communications.slice(0, 20).map((row) => (
                <li key={row.id} className="border-b border-border/60 pb-3 text-sm last:border-0">
                  <p className="font-medium text-text-heading">{row.title}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {row.sentAt}
                    {row.actor ? ` · ${row.actor}` : ''}
                    {row.status ? ` · ${row.status}` : ''}
                  </p>
                  {row.preview ? <p className="mt-1 text-secondary">{row.preview}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
