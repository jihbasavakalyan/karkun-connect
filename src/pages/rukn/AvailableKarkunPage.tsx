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
  ConnectMuttafiqRequestModal,
} from '@/components/relationship'
import { EmptyState, PageShell } from '@/components/ui'
import { PlanningConversationModal } from '@/features/digitalRafeeq/planning'
import {
  humanizeAvailableKarkunStatus,
  humanizeConnectionConfirmed,
} from '@/lib/relationshipPresentation'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import { toOperatorAssignmentError } from '@/lib/assignment/operatorFacingError'
import {
  getAvailableKarkunPoolHydrateFailureMessage,
  isAvailableKarkunPoolHydrateFailed,
} from '@/repositories/availableKarkunPoolHydrate'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type PlanningTarget = {
  karkunId: string
  karkunName: string
  assignmentId?: string
}

export function AvailableKarkunPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const peopleVersion = usePeopleStore()
  const { assignmentVersion, getAvailableKarkunan, assignKarkun } = useAssignmentEngine()
  const availableKarkunan = getAvailableKarkunan(ruknId ?? undefined)
  const [query, setQuery] = useState('')
  const [pendingKarkun, setPendingKarkun] = useState<KarkunRegistryRecord | null>(null)
  const [error, setError] = useState('')
  const [connectLoading, setConnectLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [planning, setPlanning] = useState<PlanningTarget | null>(null)
  const [showConnectMuttafiq, setShowConnectMuttafiq] = useState(false)

  const filtered = useMemo(() => {
    void peopleVersion
    void assignmentVersion
    return availableKarkunan.filter((karkun) => matchesKarkunRegistrySearch(karkun, query))
  }, [availableKarkunan, query, peopleVersion, assignmentVersion])

  const handleConfirmConnect = () => {
    void import('@/lib/debug/kc0061ConnectTrace').then(
      ({
        connectStepEnter,
        connectStepExit,
        connectStepEarlyReturn,
        connectStepException,
        traceConnect,
      }) => {
        const uiSpan = connectStepEnter('ui.handleConfirmConnect', {
          karkunId: pendingKarkun?.id ?? null,
          ruknId,
          connectLoading,
        })
        if (!pendingKarkun || !ruknId || connectLoading) {
          connectStepEarlyReturn('ui.handleConfirmConnect', 'missing_pending_or_loading', {
            hasPending: Boolean(pendingKarkun),
            hasRuknId: Boolean(ruknId),
            connectLoading,
          })
          connectStepExit(uiSpan, 'ui.handleConfirmConnect', { aborted: true })
          return
        }
        setConnectLoading(true)
        setError('')
        void (async () => {
          traceConnect('confirm.click', {
            karkunId: pendingKarkun.id,
            ruknId,
          })
          try {
            const result = await assignKarkun(pendingKarkun.id, ruknId, 'Rukn')
            if (!result.success) {
              console.error('[KC-0061:connect] assign returned failure (raw)', result.error)
              traceConnect('assign.fail', { stage: 'ui', rawError: result.error }, result.error)
              connectStepException('ui.toOperatorAssignmentError', result.error, {
                beforeRemap: result.error,
              })
              const remapped = toOperatorAssignmentError(result.error, {
                karkunId: pendingKarkun.id,
                ruknId,
              })
              connectStepExit(uiSpan, 'ui.handleConfirmConnect', {
                success: false,
                remapped,
              })
              setError(remapped)
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
            connectStepExit(uiSpan, 'ui.handleConfirmConnect', { success: true })
          } finally {
            setConnectLoading(false)
          }
        })()
      },
    )
  }

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  const availablePoolFailed = isAvailableKarkunPoolHydrateFailed()
  const availablePoolError = getAvailableKarkunPoolHydrateFailureMessage()

  return (
    <PageShell variant="narrow" className={embedded ? 'app-screen-embedded' : 'app-screen connect-screen max-w-3xl'}>
      {embedded ? (
        <p className="rukn-karkun-view-hint">
          {availablePoolFailed
            ? 'Available Karkuns could not be loaded'
            : availableKarkunan.length === 1
              ? '1 Karkun ready to connect'
              : `${availableKarkunan.length} Karkuns ready to connect`}
        </p>
      ) : (
      <header className="app-screen-header">
        <h1 className="app-screen-title">Available</h1>
        <p className="app-screen-subtitle">
          {availablePoolFailed
            ? 'Available Karkuns could not be loaded'
            : `${availableKarkunan.length} ready to connect`}
        </p>
      </header>
      )}

      {!availablePoolFailed && availableKarkunan.length > 0 ? (
        <>
          <p className="rukn-karkun-eligibility-hint">{humanizeAvailableKarkunStatus()}</p>
          <KarkunSearchField
            id="available-karkun-search"
            value={query}
            onChange={setQuery}
            resultCount={query.trim() ? filtered.length : undefined}
            sticky
          />
        </>
      ) : null}

      {successMessage && (
        <div className="ds-banner-success" role="status">
          {successMessage}
        </div>
      )}

      {availablePoolFailed ? (
        <div className="ds-banner-error" role="alert">
          <p className="font-semibold">Unable to load available Karkuns</p>
          <p className="mt-1 text-sm">
            The Connect list was not loaded. This is not a &quot;0 available&quot; campaign state.
            Retry after signing in again if the problem continues.
          </p>
          {availablePoolError ? (
            <p className="mt-1 break-words text-xs">{availablePoolError}</p>
          ) : null}
          <button
            type="button"
            className="connect-add-karkun-button mt-3"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : availableKarkunan.length === 0 ? (
        <EmptyState
          icon="link"
          title="All caught up"
          description="No Karkun is available to connect right now. Check back later or contact your administrator."
          primaryAction={{ label: 'View My Karkun', href: ROUTES.RUKN_KARKUN }}
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

      {!availablePoolFailed ? (
        <div className="rukn-karkun-link-muttafiq">
          <button
            type="button"
            className="rukn-karkun-add-secondary"
            onClick={() => {
              setShowConnectMuttafiq(true)
              setError('')
              setSuccessMessage('')
            }}
          >
            Link Muttafiq
          </button>
        </div>
      ) : null}

      <ConnectKarkunConfirmModal
        isOpen={pendingKarkun !== null}
        karkun={pendingKarkun}
        error={error}
        loading={connectLoading}
        onClose={() => {
          if (connectLoading) return
          setPendingKarkun(null)
          setError('')
        }}
        onConfirm={handleConfirmConnect}
      />

      <ConnectMuttafiqRequestModal
        isOpen={showConnectMuttafiq}
        ruknId={ruknId}
        onClose={() => setShowConnectMuttafiq(false)}
        onSubmitted={() =>
          setSuccessMessage('Muttafiq link request submitted for administrator approval.')
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
