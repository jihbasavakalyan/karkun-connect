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
  NewKarkunRequestModal,
} from '@/components/relationship'
import { EmptyState, PageShell } from '@/components/ui'
import { PlanningConversationModal } from '@/features/digitalRafeeq/planning'
import { humanizeConnectionConfirmed } from '@/lib/relationshipPresentation'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type PlanningTarget = {
  karkunId: string
  karkunName: string
  assignmentId?: string
}

export function AvailableKarkunPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const peopleVersion = usePeopleStore()
  const { assignmentVersion, getAvailableKarkunan, assignKarkun } = useAssignmentEngine()
  const availableKarkunan = getAvailableKarkunan(ruknId ?? undefined)
  const [query, setQuery] = useState('')
  const [pendingKarkun, setPendingKarkun] = useState<KarkunRegistryRecord | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [planning, setPlanning] = useState<PlanningTarget | null>(null)
  const [showNewRequest, setShowNewRequest] = useState(false)

  const filtered = useMemo(() => {
    void peopleVersion
    void assignmentVersion
    return availableKarkunan.filter((karkun) => matchesKarkunRegistrySearch(karkun, query))
  }, [availableKarkunan, query, peopleVersion, assignmentVersion])

  const handleConfirmConnect = () => {
    if (!pendingKarkun || !ruknId) return
    void (async () => {
      const result = await assignKarkun(pendingKarkun.id, ruknId, 'Rukn')
      if (!result.success) {
        setError(result.error)
        return
      }
      const connected = pendingKarkun
      setSuccessMessage(humanizeConnectionConfirmed(result.assignment?.assignmentNumber))
      setPendingKarkun(null)
      setError('')
      setPlanning({
        karkunId: connected.id,
        karkunName: connected.name,
        assignmentId: result.assignment?.assignmentId,
      })
    })()
  }

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <PageShell variant="narrow" className="app-screen connect-screen max-w-3xl">
      <header className="app-screen-header">
        <h1 className="app-screen-title">Connect</h1>
        <p className="app-screen-subtitle">
          {availableKarkunan.length} ready to connect
        </p>
      </header>

      <KarkunSearchField
        id="available-karkun-search"
        value={query}
        onChange={setQuery}
        resultCount={query.trim() ? filtered.length : undefined}
        sticky
      />

      <div className="connect-add-karkun">
        <button
          type="button"
          className="connect-add-karkun-button"
          onClick={() => {
            setShowNewRequest(true)
            setError('')
            setSuccessMessage('')
          }}
        >
          ➕ Add New Karkun
        </button>
      </div>

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

      <NewKarkunRequestModal
        isOpen={showNewRequest}
        ruknId={ruknId}
        onClose={() => setShowNewRequest(false)}
        onSubmitted={() =>
          setSuccessMessage('Request submitted for administrator approval.')
        }
      />

      {planning && ruknId ? (
        <PlanningConversationModal
          isOpen
          karkunId={planning.karkunId}
          karkunName={planning.karkunName}
          ruknId={ruknId}
          assignmentId={planning.assignmentId}
          onClose={() => setPlanning(null)}
        />
      ) : null}
    </PageShell>
  )
}
