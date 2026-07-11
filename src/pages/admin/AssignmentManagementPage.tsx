import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { adminAnnexure1Path, adminRuknDetailPath } from '@/constants/routes'
import { AssignmentMappingView } from '@/components/assignment/AssignmentMappingView'
import {
  AvailableKarkunRow,
  ConnectKarkunConfirmModal,
  KarkunSearchField,
} from '@/components/relationship'
import { ruknMaster } from '@/data/ruknMaster'
import { exportAssignmentHistory } from '@/lib/assignmentExport'
import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import { humanizeConnectionConfirmed } from '@/lib/relationshipPresentation'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import {
  getKarkunsForRuknAssignment,
  ruknMatchesAssignmentSearch,
} from '@/services/assignmentService'
import { AssignmentHistoryTimeline } from '@/components/forms/assignment/AssignmentHistoryTimeline'
import { AssignRuknModal } from '@/components/forms/assignment/AssignRuknModal'
import { RemoveAssignmentModal } from '@/components/forms/assignment/RemoveAssignmentModal'
import { RestoreAssignmentModal } from '@/components/forms/assignment/RestoreAssignmentModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageHeader, PageShell } from '@/components/ui'
import { formatPersonStatus } from '@/types/people.types'

type ModalMode = 'assign' | 'replace' | 'remove' | 'restore' | 'history' | null

export function AssignmentManagementPage() {
  usePeopleStore()
  const {
    assignmentVersion,
    getRuknAssignmentSummary,
    assignRukn,
    removeAssignment,
    restoreAssignment,
  } = useAssignmentEngine()

  const [searchParams, setSearchParams] = useSearchParams()
  const activeView = searchParams.get('view') === 'mapping' ? 'mapping' : 'assign'

  const [globalSearch, setGlobalSearch] = useState('')
  const [ruknSearch, setRuknSearch] = useState('')
  const [karkunSearch, setKarkunSearch] = useState('')
  const [selectedRuknId, setSelectedRuknId] = useState<string | null>(
    () => searchParams.get('rukn'),
  )
  const [selectedKarkunId, setSelectedKarkunId] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [actionError, setActionError] = useState('')
  const [lastAssignmentNumber, setLastAssignmentNumber] = useState<string | null>(null)
  const [removingKarkun, setRemovingKarkun] = useState<{ id: string; name: string } | null>(null)
  const [connectConfirmKarkunId, setConnectConfirmKarkunId] = useState<string | null>(null)

  const selectRukn = (ruknId: string) => {
    setSelectedRuknId(ruknId)
    setSelectedKarkunId(null)
    setLastAssignmentNumber(null)
    setActionError('')
  }

  const selectedRukn = selectedRuknId ? ruknMaster.find((r) => r.id === selectedRuknId) : null
  const ruknSummary = selectedRuknId ? getRuknAssignmentSummary(selectedRuknId) : null

  const connectConfirmKarkun = connectConfirmKarkunId
    ? getKarkunById(connectConfirmKarkunId) ?? null
    : null

  const assignableKarkuns = useMemo(() => {
    void assignmentVersion
    if (!selectedRuknId) return []
    // Use only the Available Karkuns search field so clearing it restores the full eligible list.
    return getKarkunsForRuknAssignment(selectedRuknId).filter((karkun) =>
      matchesKarkunRegistrySearch(karkun, karkunSearch),
    )
  }, [selectedRuknId, karkunSearch, assignmentVersion])

  const filteredRukns = useMemo(() => {
    void assignmentVersion
    const query = (globalSearch || ruknSearch).trim().toLowerCase()
    return ruknMaster.filter((rukn) => {
      if (globalSearch.trim()) {
        return ruknMatchesAssignmentSearch(rukn.id, globalSearch)
      }
      if (!query) return true
      return (
        rukn.name.toLowerCase().includes(query) ||
        rukn.mobile.toLowerCase().includes(query)
      )
    })
  }, [globalSearch, ruknSearch, assignmentVersion])

  const changeView = (next: 'assign' | 'mapping') => {
    setSearchParams(
      (params) => {
        const updated = new URLSearchParams(params)
        if (next === 'mapping') {
          updated.set('view', 'mapping')
        } else {
          updated.delete('view')
        }
        return updated
      },
      { replace: true },
    )
  }

  const closeModal = () => {
    setModalMode(null)
    setActionError('')
  }

  const completeAssignment = (result: ReturnType<typeof assignRukn>) => {
    if (!result.success) {
      setActionError(result.error)
      return false
    }

    setLastAssignmentNumber(result.assignment?.assignmentNumber ?? null)
    setSelectedKarkunId(null)
    setConnectConfirmKarkunId(null)
    setActionError('')
    closeModal()
    return true
  }

  const handleConfirmAssignment = () => {
    if (!selectedRukn || !selectedKarkunId) {
      setActionError('Select a Rukn and an available Karkun to continue.')
      return
    }

    completeAssignment(
      assignRukn({
        ruknId: selectedRukn.id,
        karkunId: selectedKarkunId,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        assignedBy: 'Administrator',
      }),
    )
  }

  const handleAssign = (input: { karkunId: string; effectiveFrom: string; remarks?: string }) => {
    if (!selectedRukn) return
    completeAssignment(
      assignRukn({
        ruknId: selectedRukn.id,
        karkunId: input.karkunId,
        effectiveFrom: input.effectiveFrom,
        remarks: input.remarks,
        assignedBy: 'Administrator',
      }),
    )
  }

  const handleRemove = (input: {
    effectiveFrom: string
    removalReason: import('@/types/assignment').RemovalReason
    remarks?: string
  }) => {
    if (!selectedRukn || !removingKarkun) return
    const result = removeAssignment({
      ruknId: selectedRukn.id,
      karkunId: removingKarkun.id,
      effectiveFrom: input.effectiveFrom,
      removalReason: input.removalReason,
      remarks: input.remarks,
      assignedBy: 'Administrator',
    })
    if (!result.success) {
      setActionError(result.error)
      return
    }
    setRemovingKarkun(null)
    closeModal()
  }

  const handleRestore = (input: {
    karkunId: string
    effectiveFrom: string
    remarks?: string
  }) => {
    if (!selectedRukn) return
    const result = restoreAssignment({
      ruknId: selectedRukn.id,
      karkunId: input.karkunId,
      effectiveFrom: input.effectiveFrom,
      remarks: input.remarks,
      assignedBy: 'Administrator',
    })
    if (!result.success) {
      setActionError(result.error)
      return
    }
    closeModal()
  }

  return (
    <PageShell variant="wide">
      <PageHeader
        title="Connections"
        description="Manage Rukn–Karkun connections. One Rukn may hold multiple active Karkuns; connection history is permanent."
        actions={
          <SecondaryButton type="button" onClick={() => exportAssignmentHistory()}>
            Export History (CSV)
          </SecondaryButton>
        }
      />

      <div className="ds-tab-pill-nav" role="tablist" aria-label="Connection views">
        <button
          type="button"
          onClick={() => changeView('assign')}
          className={`ds-tab-pill ${activeView === 'assign' ? 'ds-tab-pill-active' : ''}`}
        >
          Connection Desk
        </button>
        <button
          type="button"
          onClick={() => changeView('mapping')}
          className={`ds-tab-pill ${activeView === 'mapping' ? 'ds-tab-pill-active' : ''}`}
        >
          Connections View
        </button>
      </div>

      {activeView === 'mapping' && <AssignmentMappingView version={assignmentVersion} />}

      {activeView === 'assign' && (
      <>
      <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <label htmlFor="assignment-global-search" className="text-sm font-medium text-text-heading">
          Search connections
        </label>
        <input
          id="assignment-global-search"
          type="search"
          value={globalSearch}
          placeholder="Search by Rukn, Karkun, mobile, or connection number (ASN-...)..."
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
        />
      </div>

      {lastAssignmentNumber && (
        <div
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
          role="status"
        >
          {humanizeConnectionConfirmed(lastAssignmentNumber)}
        </div>
      )}

      {actionError && !modalMode && (
        <div className="rounded-(--radius-card) border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
            <h2 className="text-lg font-semibold text-text-heading">Rukn</h2>
            <input
              type="search"
              value={ruknSearch}
              placeholder="Search Rukn..."
              onChange={(e) => setRuknSearch(e.target.value)}
              className="mt-3 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
            />
          </div>

          <ul className="max-h-[420px] space-y-2 overflow-y-auto">
            {filteredRukns.map((rukn) => {
              const summary = getRuknAssignmentSummary(rukn.id)
              const isSelected = selectedRuknId === rukn.id
              return (
                <li key={rukn.id}>
                  <button
                    type="button"
                    onClick={() => selectRukn(rukn.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-shadow hover:shadow-card ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-text-heading">{rukn.name}</p>
                        <p className="mt-1 text-sm text-secondary">
                          {rukn.gender} · {formatPersonStatus(rukn.status)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          summary.assignmentStatus === 'Assigned'
                            ? 'bg-green-100 text-green-800'
                            : summary.assignmentStatus === 'Suspended'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {getConnectionStatusLabel(summary.assignmentStatus)}
                      </span>
                    </div>
                    {summary.currentAssignment && (
                      <p className="mt-2 text-sm text-secondary">
                        Karkun:{' '}
                        {getKarkunById(summary.currentAssignment.karkunId)?.name ?? '—'}
                      </p>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="space-y-4">
          <div className="home-card">
            <h2 className="text-lg font-semibold text-text-heading">Available Karkuns</h2>
            <p className="mt-1 text-sm text-secondary">
              {selectedRukn
                ? `Connect ${selectedRukn.gender} Karkuns to ${selectedRukn.name} — search and tap Connect.`
                : 'Select a Rukn first, then connect available Karkuns.'}
            </p>
            {selectedRukn && (
              <div className="mt-3">
                <KarkunSearchField
                  id="admin-karkun-connect-search"
                  value={karkunSearch}
                  onChange={setKarkunSearch}
                  resultCount={karkunSearch.trim() ? assignableKarkuns.length : undefined}
                />
              </div>
            )}
          </div>

          {!selectedRukn ? (
            <div className="home-card text-center text-secondary">
              Select a Rukn on the left to see Karkuns ready to connect.
            </div>
          ) : assignableKarkuns.length === 0 ? (
            <div className="home-card text-center text-secondary">
              No available Karkuns match your search for {selectedRukn.name}.
            </div>
          ) : (
            <ul className="relationship-row-list max-h-[min(50vh,24rem)] overflow-y-auto overscroll-contain pr-1">
              {assignableKarkuns.map((karkun) => (
                <li key={karkun.id}>
                  <AvailableKarkunRow
                    karkun={karkun}
                    onConnect={() => {
                      setConnectConfirmKarkunId(karkun.id)
                      setSelectedKarkunId(karkun.id)
                      setActionError('')
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>


      {selectedRukn && ruknSummary && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">{selectedRukn.name}</h2>
              <p className="mt-1 text-sm text-secondary">
                Status: {getConnectionStatusLabel(ruknSummary.assignmentStatus)}
                {ruknSummary.assignedKarkunCount > 0 &&
                  ` · ${ruknSummary.assignedKarkunCount} active Karkun${
                    ruknSummary.assignedKarkunCount === 1 ? '' : 's'
                  }`}
                {ruknSummary.assignmentSince &&
                  ` · Since ${ruknSummary.assignmentSince.slice(0, 10)}`}
              </p>
              <Link
                to={adminRuknDetailPath(selectedRukn.id)}
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                View Rukn profile →
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="button" onClick={() => setModalMode('assign')}>
                Connect Karkun
              </PrimaryButton>
              {ruknSummary.assignmentStatus !== 'Assigned' && (
                <SecondaryButton type="button" onClick={() => setModalMode('restore')}>
                  Reconnect
                </SecondaryButton>
              )}
              <SecondaryButton type="button" onClick={() => setModalMode('history')}>
                View History
              </SecondaryButton>
            </div>
          </div>

          {ruknSummary.activeAssignments.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-text-heading">
                Connected Karkuns ({ruknSummary.assignedKarkunCount})
              </h3>
              <ul className="mt-3 space-y-2">
                {ruknSummary.activeAssignments.map((assignment) => {
                  const assignedKarkun = getKarkunById(assignment.karkunId)
                  return (
                    <li
                      key={assignment.assignmentId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-text-heading">
                          {assignedKarkun?.name ?? assignment.karkunId}
                        </p>
                        <p className="text-xs text-secondary">{assignment.assignmentNumber}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link to={adminAnnexure1Path(assignment.karkunId)}>
                          <SecondaryButton type="button" className="px-3 py-1.5 text-sm">
                            Open Connection
                          </SecondaryButton>
                        </Link>
                        <SecondaryButton
                          type="button"
                          className="px-3 py-1.5 text-sm"
                          onClick={() => {
                            setRemovingKarkun({
                              id: assignment.karkunId,
                              name: assignedKarkun?.name ?? assignment.karkunId,
                            })
                            setModalMode('remove')
                          }}
                        >
                          Disconnect
                        </SecondaryButton>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <AssignmentHistoryTimeline
              history={ruknSummary.assignmentHistory}
              currentAssignment={ruknSummary.currentAssignment}
              perspective="rukn"
            />
          </div>
        </section>
      )}
      </>
      )}

      <ConnectKarkunConfirmModal
        isOpen={connectConfirmKarkun !== null}
        karkun={connectConfirmKarkun}
        ruknName={selectedRukn?.name}
        error={actionError}
        onClose={() => {
          setConnectConfirmKarkunId(null)
          setActionError('')
        }}
        onConfirm={handleConfirmAssignment}
      />

      <AssignRuknModal
        key={selectedRukn?.id ?? 'assign-closed'}
        isOpen={modalMode === 'assign'}
        rukn={selectedRukn ?? null}
        error={actionError}
        onClose={closeModal}
        onSubmit={handleAssign}
      />

      <RemoveAssignmentModal
        isOpen={modalMode === 'remove'}
        rukn={selectedRukn ?? null}
        currentKarkunName={removingKarkun?.name ?? 'Unknown'}
        error={actionError}
        onClose={() => {
          setRemovingKarkun(null)
          closeModal()
        }}
        onSubmit={handleRemove}
      />

      <RestoreAssignmentModal
        isOpen={modalMode === 'restore'}
        rukn={selectedRukn ?? null}
        error={actionError}
        onClose={closeModal}
        onSubmit={handleRestore}
      />
    </PageShell>
  )
}
