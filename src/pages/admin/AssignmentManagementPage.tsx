import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { adminRuknDetailPath } from '@/constants/routes'
import { getRuknById, ruknMaster } from '@/data/ruknMaster'
import { exportAssignmentHistory } from '@/lib/assignmentExport'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { ruknMatchesAssignmentSearch } from '@/services/assignmentService'
import { getAssignmentHistoryForKarkun } from '@/stores/assignmentStore'
import { AssignmentHistoryTimeline } from '@/components/forms/assignment/AssignmentHistoryTimeline'
import { AssignRuknModal } from '@/components/forms/assignment/AssignRuknModal'
import { RemoveAssignmentModal } from '@/components/forms/assignment/RemoveAssignmentModal'
import { ReplaceAssignmentModal } from '@/components/forms/assignment/ReplaceAssignmentModal'
import { RestoreAssignmentModal } from '@/components/forms/assignment/RestoreAssignmentModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { formatPersonStatus } from '@/types/people.types'

type ModalMode = 'assign' | 'replace' | 'remove' | 'restore' | 'history' | null

export function AssignmentManagementPage() {
  usePeopleStore()
  const {
    getRuknAssignmentSummary,
    getKarkunWithWorkload,
    assignRukn,
    replaceAssignment,
    removeAssignment,
    restoreAssignment,
  } = useAssignmentEngine()

  const [globalSearch, setGlobalSearch] = useState('')
  const [ruknSearch, setRuknSearch] = useState('')
  const [karkunSearch, setKarkunSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRuknId, setSelectedRuknId] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [actionError, setActionError] = useState('')

  const selectedRukn = selectedRuknId ? ruknMaster.find((r) => r.id === selectedRuknId) : null
  const ruknSummary = selectedRuknId ? getRuknAssignmentSummary(selectedRuknId) : null

  const filteredRukns = useMemo(() => {
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
  }, [globalSearch, ruknSearch])

  const karkunWorkload = useMemo(() => {
    const globalQuery = globalSearch.trim().toLowerCase()
    return getKarkunWithWorkload().filter(({ karkun }) => {
      if (genderFilter && karkun.gender !== genderFilter) return false
      if (statusFilter && karkun.status !== statusFilter) return false

      const searchQuery = (globalQuery || karkunSearch.trim().toLowerCase())
      if (searchQuery) {
        const haystack = [karkun.name, karkun.mobile, karkun.area].join(' ').toLowerCase()
        const history = getAssignmentHistoryForKarkun(karkun.id)
        const matchesHistory = history.some(
          (record) =>
            record.assignmentNumber.toLowerCase().includes(searchQuery) ||
            getRuknById(record.ruknId)?.name.toLowerCase().includes(searchQuery),
        )
        if (!haystack.includes(searchQuery) && !matchesHistory) return false
      }
      return true
    })
  }, [getKarkunWithWorkload, genderFilter, statusFilter, karkunSearch, globalSearch])

  const currentKarkunName =
    ruknSummary?.currentAssignment &&
    getKarkunById(ruknSummary.currentAssignment.karkunId)?.name

  const closeModal = () => {
    setModalMode(null)
    setActionError('')
  }

  const handleAssign = (input: { karkunId: string; effectiveFrom: string; remarks?: string }) => {
    if (!selectedRukn) return
    const result = assignRukn({
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

  const handleReplace = (input: {
    newKarkunId: string
    effectiveFrom: string
    replacementReason: import('@/types/assignment').ReplacementReason
    remarks?: string
  }) => {
    if (!selectedRukn) return
    const result = replaceAssignment({
      ruknId: selectedRukn.id,
      newKarkunId: input.newKarkunId,
      effectiveFrom: input.effectiveFrom,
      replacementReason: input.replacementReason,
      remarks: input.remarks,
      assignedBy: 'Administrator',
    })
    if (!result.success) {
      setActionError(result.error)
      return
    }
    closeModal()
  }

  const handleRemove = (input: {
    effectiveFrom: string
    removalReason: import('@/types/assignment').RemovalReason
    remarks?: string
  }) => {
    if (!selectedRukn) return
    const result = removeAssignment({
      ruknId: selectedRukn.id,
      effectiveFrom: input.effectiveFrom,
      removalReason: input.removalReason,
      remarks: input.remarks,
      assignedBy: 'Administrator',
    })
    if (!result.success) {
      setActionError(result.error)
      return
    }
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-heading">Assignment Management</h1>
          <p className="mt-2 text-secondary">
            Manage Rukn–Karkun relationships. One active assignment per Rukn; history is permanent.
          </p>
        </div>
        <SecondaryButton type="button" onClick={() => exportAssignmentHistory()}>
          Export History (CSV)
        </SecondaryButton>
      </div>

      <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <label htmlFor="assignment-global-search" className="text-sm font-medium text-text-heading">
          Search assignments
        </label>
        <input
          id="assignment-global-search"
          type="search"
          value={globalSearch}
          placeholder="Search by Rukn, Karkun, mobile, or assignment number (ASN-...)..."
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
        />
      </div>

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
                    onClick={() => setSelectedRuknId(rukn.id)}
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
                        {summary.assignmentStatus}
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
          <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
            <h2 className="text-lg font-semibold text-text-heading">Karkun Workload</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <input
                type="search"
                value={karkunSearch}
                placeholder="Search..."
                onChange={(e) => setKarkunSearch(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-3"
              />
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <ul className="max-h-[420px] space-y-2 overflow-y-auto">
            {karkunWorkload.map(({ karkun, workload }) => (
              <li
                key={karkun.id}
                className="rounded-lg border border-border bg-surface p-4 shadow-card"
              >
                <p className="font-semibold text-text-heading">{karkun.name}</p>
                <p className="mt-1 text-sm text-secondary">
                  {karkun.gender} · {workload.activeAssignments.length} active ·{' '}
                  {workload.inactiveAssignments.length} past
                </p>
                {workload.assignedRukns.length > 0 && (
                  <p className="mt-1 text-sm text-secondary">
                    Rukns: {workload.assignedRukns.join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {selectedRukn && ruknSummary && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">{selectedRukn.name}</h2>
              <p className="mt-1 text-sm text-secondary">
                Status: {ruknSummary.assignmentStatus}
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
              {ruknSummary.assignmentStatus === 'Unassigned' ? (
                <>
                  <PrimaryButton type="button" onClick={() => setModalMode('assign')}>
                    Assign
                  </PrimaryButton>
                  <SecondaryButton type="button" onClick={() => setModalMode('restore')}>
                    Restore
                  </SecondaryButton>
                </>
              ) : (
                <>
                  <SecondaryButton type="button" onClick={() => setModalMode('replace')}>
                    Replace
                  </SecondaryButton>
                  <SecondaryButton type="button" onClick={() => setModalMode('remove')}>
                    Remove
                  </SecondaryButton>
                </>
              )}
              <SecondaryButton type="button" onClick={() => setModalMode('history')}>
                View History
              </SecondaryButton>
            </div>
          </div>

          <div className="mt-6">
            <AssignmentHistoryTimeline
              history={ruknSummary.assignmentHistory}
              currentAssignment={ruknSummary.currentAssignment}
              perspective="rukn"
            />
          </div>
        </section>
      )}

      <AssignRuknModal
        isOpen={modalMode === 'assign'}
        rukn={selectedRukn ?? null}
        error={actionError}
        onClose={closeModal}
        onSubmit={handleAssign}
      />

      <ReplaceAssignmentModal
        isOpen={modalMode === 'replace'}
        rukn={selectedRukn ?? null}
        currentKarkunName={currentKarkunName ?? 'Unknown'}
        error={actionError}
        onClose={closeModal}
        onSubmit={handleReplace}
      />

      <RemoveAssignmentModal
        isOpen={modalMode === 'remove'}
        rukn={selectedRukn ?? null}
        currentKarkunName={currentKarkunName ?? 'Unknown'}
        error={actionError}
        onClose={closeModal}
        onSubmit={handleRemove}
      />

      <RestoreAssignmentModal
        isOpen={modalMode === 'restore'}
        rukn={selectedRukn ?? null}
        error={actionError}
        onClose={closeModal}
        onSubmit={handleRestore}
      />
    </div>
  )
}
