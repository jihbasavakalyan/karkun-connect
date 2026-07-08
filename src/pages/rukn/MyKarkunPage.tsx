import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { DEFAULT_DEMO_RUKN_ID } from '@/constants/demoRukn'
import { ROUTES } from '@/constants/routes'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import { ConnectedKarkunCard, KarkunSearchField } from '@/components/relationship'
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
    <div className="relationship-page space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-text-heading">Connected Karkuns</h1>
        <p className="mt-2 text-secondary">
          Guide each connection — call, visit, or schedule without leaving this page.
        </p>
      </header>

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
        <div className="home-card text-center">
          <p className="text-secondary">You have not connected with any Karkun yet.</p>
          <Link
            to={ROUTES.RUKN_AVAILABLE_KARKUN}
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            + Connect Karkun
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="home-card text-center">
          <p className="text-secondary">No connected Karkun matches “{query}”.</p>
        </div>
      ) : (
        <ul className="relationship-row-list">
          {filtered.map((karkun) => (
            <li key={karkun.id}>
              <ConnectedKarkunCard karkun={karkun} ruknId={ruknId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
