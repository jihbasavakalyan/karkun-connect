import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { DEFAULT_DEMO_RUKN_ID } from '@/constants/demoRukn'
import { ROUTES } from '@/constants/routes'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import { ConnectedKarkunCard, KarkunSearchField } from '@/components/relationship'
import { EmptyState, PageHeader, PageShell } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'

export function MyKarkunPage() {
  const { user } = useAuth()
  const ruknId = user?.ruknId ?? DEFAULT_DEMO_RUKN_ID
  const { getAssignedKarkunanForRukn } = useAssignmentEngine()
  const myKarkunan = getAssignedKarkunanForRukn(ruknId)
  const [query, setQuery] = useState('')

  const sortedKarkuns = useMemo(() => {
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

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <PageShell variant="narrow" className="relationship-page max-w-3xl">
      <PageHeader
        title="Connected Karkuns"
        description="Guide each connection — call, visit, or schedule without leaving this page."
      />

      <ExecutionSuccessBanner />

      {myKarkunan.length > 0 && (
        <KarkunSearchField
          id="connected-karkun-search"
          value={query}
          onChange={setQuery}
          resultCount={query.trim() ? filtered.length : undefined}
          sticky
        />
      )}

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
        <ul className="relationship-row-list">
          {filtered.map((karkun) => (
            <li key={karkun.id}>
              <ConnectedKarkunCard karkun={karkun} ruknId={ruknId} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  )
}
