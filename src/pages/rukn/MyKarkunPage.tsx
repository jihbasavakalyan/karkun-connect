import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import {
  ConnectedKarkunCard,
  KarkunSearchField,
} from '@/components/relationship'
import { EmptyState, PageShell } from '@/components/ui'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'

export function MyKarkunPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const { assignmentVersion, getAssignedKarkunanForRukn } = useAssignmentEngine()
  const [query, setQuery] = useState('')

  // Canonical connected set — re-read when assignments OR people registry change.
  const myKarkunan = useMemo(
    () => getAssignedKarkunanForRukn(ruknId ?? ''),
    [assignmentVersion, getAssignedKarkunanForRukn, ruknId],
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

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <PageShell variant="narrow" className="app-screen connected-screen">
      <header className="app-screen-header">
        <h1 className="app-screen-title">Connected</h1>
        <p className="app-screen-subtitle">
          {myKarkunan.length} Karkun{myKarkunan.length === 1 ? '' : 's'}
        </p>
      </header>

      <ExecutionSuccessBanner />

      {myKarkunan.length > 0 ? (
        <KarkunSearchField
          id="connected-karkun-search"
          value={query}
          onChange={setQuery}
          resultCount={query.trim() ? filtered.length : undefined}
          sticky
        />
      ) : null}

      <section className="connected-app-list" aria-label="Connected Karkuns">
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
          <ul className="connected-app-grid">
            {filtered.map((karkun) => (
              <li key={karkun.id}>
                <ConnectedKarkunCard karkun={karkun} ruknId={ruknId} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  )
}
