import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import {
  ConnectedKarkunCard,
  KarkunSearchField,
  MyKarkunProgress,
} from '@/components/relationship'
import { EmptyState, PageHeader, PageShell } from '@/components/ui'
import { AskDigitalRafeeqCard } from '@/components/mission-control'
import { ExecutionGuidanceCard } from '@/features/digitalRafeeq/contextual'
import { openDigitalRafeeqAssistant } from '@/features/digitalRafeeq/launcher'
import { buildContextualRafeeqGuidance } from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import { buildRuknProgressStages } from '@/lib/ruknProgressPresentation'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'

export function MyKarkunPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const { getAssignedKarkunanForRukn } = useAssignmentEngine()
  const myKarkunan = getAssignedKarkunanForRukn(ruknId ?? '')
  const [query, setQuery] = useState('')

  const progressStages = useMemo(
    () => (ruknId ? buildRuknProgressStages(ruknId) : []),
    [ruknId, myKarkunan],
  )

  const sortedKarkuns = useMemo(() => {
    if (!ruknId) return []
    const guidanceOrder = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId)).map(
      (guidance) => guidance.karkunId,
    )
    const orderMap = new Map(guidanceOrder.map((id, index) => [id, index]))
    return [...myKarkunan].sort(
      (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999),
    )
  }, [myKarkunan, ruknId])

  const filtered = useMemo(() => {
    return sortedKarkuns.filter((karkun) => matchesKarkunRegistrySearch(karkun, query))
  }, [sortedKarkuns, query])

  const rafeeqLine = ruknId ? buildContextualRafeeqGuidance(ruknId) : undefined

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <PageShell variant="narrow" className="relationship-page connected-workspace max-w-3xl">
      <PageHeader
        title="Connected Karkuns"
        description="Your personal workspace — contact one more Karkun today."
      />

      <ExecutionSuccessBanner />

      <AskDigitalRafeeqCard
        featured
        onOpen={openDigitalRafeeqAssistant}
        guidanceLine={rafeeqLine}
      />

      {myKarkunan.length > 0 ? (
        <details className="connected-progress-details">
          <summary>
            <span>My Karkun Progress</span>
            <span className="connected-progress-hint">{myKarkunan.length} connected</span>
          </summary>
          <MyKarkunProgress stages={progressStages} totalConnected={myKarkunan.length} />
        </details>
      ) : null}

      <section className="connected-workspace-list" aria-label="Connected Karkuns">
        <div className="connected-workspace-list-head">
          <h2 className="rukn-my-karkuns-heading">Today&apos;s contacts</h2>
          {myKarkunan.length > 0 ? (
            <KarkunSearchField
              id="connected-karkun-search"
              value={query}
              onChange={setQuery}
              resultCount={query.trim() ? filtered.length : undefined}
            />
          ) : null}
        </div>

        {myKarkunan.length === 0 ? (
          <EmptyState
            icon="users"
            title="No connections yet"
            description="Connect with a Karkun to begin guiding them through the campaign journey."
            primaryAction={{ label: 'Connect Karkun', href: ROUTES.RUKN_AVAILABLE_KARKUN }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title="No matches"
            description={`No connected Karkun matches "${query}". Try a different name or number.`}
          />
        ) : (
          <ul className="connected-workspace-grid">
            {filtered.map((karkun) => (
              <li key={karkun.id}>
                <ConnectedKarkunCard karkun={karkun} ruknId={ruknId} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ExecutionGuidanceCard route="/rukn/my-karkun" role="rukn" />
    </PageShell>
  )
}
