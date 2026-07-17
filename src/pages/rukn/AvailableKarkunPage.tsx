import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import {
  AvailableKarkunRow,
  ConnectKarkunConfirmModal,
  KarkunSearchField,
} from '@/components/relationship'
import { EmptyState, PageHeader, PageShell } from '@/components/ui'
import { humanizeConnectionConfirmed } from '@/lib/relationshipPresentation'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export function AvailableKarkunPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const peopleVersion = usePeopleStore()
  const { assignmentVersion, getAvailableKarkunan, assignKarkun } = useAssignmentEngine()
  const availableKarkunan = getAvailableKarkunan()
  const [query, setQuery] = useState('')
  const [pendingKarkun, setPendingKarkun] = useState<KarkunRegistryRecord | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const filtered = useMemo(() => {
    void peopleVersion
    void assignmentVersion
    return availableKarkunan.filter((karkun) => matchesKarkunRegistrySearch(karkun, query))
  }, [availableKarkunan, query, peopleVersion, assignmentVersion])

  const handleConfirmConnect = () => {
    if (!pendingKarkun || !ruknId) return
    const result = assignKarkun(pendingKarkun.id, ruknId, 'Rukn')
    if (!result.success) {
      setError(result.error)
      return
    }
    setSuccessMessage(humanizeConnectionConfirmed(result.assignment?.assignmentNumber))
    setPendingKarkun(null)
    setError('')
  }

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <PageShell variant="narrow" className="relationship-page max-w-3xl">
      <PageHeader
        title="Connect Karkun"
        description={`Search, connect, and keep going — ${availableKarkunan.length} Karkun${
          availableKarkunan.length === 1 ? '' : 's'
        } ready to connect.`}
      />

      <KarkunSearchField
        id="available-karkun-search"
        value={query}
        onChange={setQuery}
        resultCount={query.trim() ? filtered.length : undefined}
        sticky
      />

      {successMessage && (
        <div className="ds-banner-success" role="status">
          {successMessage}
        </div>
      )}

      {availableKarkunan.length === 0 ? (
        <EmptyState
          icon="link"
          title="All caught up"
          description="No Karkun is available to connect right now. Check back later or contact your administrator."
          primaryAction={{ label: 'View Connected Karkuns', href: ROUTES.RUKN_MY_KARKUN }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matches"
          description={`No Karkun matches "${query}". Try a different name or number.`}
        />
      ) : (
        <ul className="relationship-row-list">
          {filtered.map((karkun) => (
            <li key={karkun.id}>
              <AvailableKarkunRow
                karkun={karkun}
                onConnect={() => {
                  setPendingKarkun(karkun)
                  setError('')
                  setSuccessMessage('')
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <ConnectKarkunConfirmModal
        isOpen={pendingKarkun !== null}
        karkun={pendingKarkun}
        error={error}
        onClose={() => {
          setPendingKarkun(null)
          setError('')
        }}
        onConfirm={handleConfirmConnect}
      />
    </PageShell>
  )
}
