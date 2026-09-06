import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/ui'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  PEOPLE_TABLE_CELL_CLASS,
  PEOPLE_TABLE_CLASS,
  PEOPLE_TABLE_ROW_CLASS,
  PEOPLE_TABLE_WRAPPER_CLASS,
} from '@/components/forms/people/peopleTableDisplay'
import { ConfirmDialog } from '@/components/forms/people'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { adminARuknDetailPath, adminKarkunProfilePath } from '@/constants/routes'
import { listActiveARuknOfficers } from '@/lib/aRuknRegistry'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useAuth } from '@/hooks/useAuth'
import { useMuttafiqRelationshipStore } from '@/hooks/useMuttafiqRelationshipStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { getRuknAssignmentSummary } from '@/services/assignmentService'
import { getActiveMuttafiqRelationshipsForRukn } from '@/stores/muttafiqRelationshipStore'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import { UI_LABELS } from '@/lib/uiTerminology'
import { executeARuknDelete, type ARuknDeleteMode } from '@/services/archiveService'
import { formatPersonStatus } from '@/types/people.types'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'
import type { Rukn } from '@/data/ruknMaster'

function formatDate(value: string | undefined): string {
  if (!value?.trim()) return '—'
  return value.slice(0, 10)
}

export function ARuknRegistryPage() {
  const peopleVersion = usePeopleStore()
  const { assignmentVersion } = useAssignmentEngine()
  const muttafiqRelationshipVersion = useMuttafiqRelationshipStore()
  void assignmentVersion
  void muttafiqRelationshipVersion
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Rukn | null>(null)
  const [deleteMode, setDeleteMode] = useState<ARuknDeleteMode | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { busy, progressMessage, run } = useWriteLifecycle()
  const isAdministrator = user?.role === 'administrator'

  const officers = useMemo(() => {
    const query = search.trim().toLowerCase()
    const rows = listActiveARuknOfficers().slice().sort((a, b) => a.id.localeCompare(b.id))
    if (!query) return rows
    return rows.filter((officer) =>
      [officer.id, officer.name, officer.mobile, officer.sourcePersonId ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registry is module state
  }, [peopleVersion, assignmentVersion, search])

  const decidedBy = user?.displayName ?? user?.uid ?? 'Administrator'

  const confirmDelete = () => {
    const officer = pendingDelete
    const mode = deleteMode
    if (!officer || !mode || busy) return
    setError('')
    setNotice('')
    void run({
      key: `a-rukn:deactivate:${officer.id}:${mode}`,
      queueLabels: ['rukns', 'karkuns'],
      work: async () => {
        const result = await executeARuknDelete({
          aRuknId: officer.id,
          mode,
          decidedBy,
        })
        if (!result.ok) {
          throw new Error(result.error)
        }
        return result
      },
    }).then((lifecycle) => {
      if (!lifecycle) return
      if (!lifecycle.ok) {
        setError(lifecycle.message)
        return
      }
      setPendingDelete(null)
      setDeleteMode(null)
      setNotice(
        mode === 'restore_karkun'
          ? `${officer.id} removed from the active ${UI_LABELS.aRukn} registry. Source Karkun restored as a normal Karkun.`
          : `${officer.id} permanently removed from the active ${UI_LABELS.aRukn} registry. Source Karkun was not restored.`,
      )
    })
  }

  return (
    <PageShell>
      <PageHeader
        title={UI_LABELS.aRukn}
        description="Independent officers promoted from Karkuns. This registry is separate from ارکان."
      />

      {error ? (
        <div className="ds-banner-error mb-3" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="ds-banner-success mb-3" role="status">
          {notice}
        </div>
      ) : null}
      {busy && progressMessage ? (
        <p className="mb-3 text-sm text-secondary" role="status" aria-live="polite">
          {progressMessage}
        </p>
      ) : null}

      <label className="block max-w-md text-sm">
        <span className="mb-1 block text-secondary">Search</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Search by AR identity, name, mobile, or source Karkun"
        />
      </label>

      {officers.length === 0 ? (
        <EmptyState
          icon="sparkles"
          title={`No ${UI_LABELS.aRukn} yet`}
          description="Promote an eligible Karkun from کارکنان. Officers appear here from the shared Rukn repository."
        />
      ) : (
        <>
          <p className="text-sm text-secondary">
            Showing {officers.length} {UI_LABELS.aRukn}
          </p>
          <div className={PEOPLE_TABLE_WRAPPER_CLASS}>
            <table className={PEOPLE_TABLE_CLASS}>
              <thead>
                <tr>
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Identity</th>
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Name</th>
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Connected Karkuns</th>
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Mobile</th>
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Source Karkun</th>
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Status</th>
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Created</th>
                  {isAdministrator ? <th className={PEOPLE_TABLE_CELL_CLASS}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {officers.map((officer) => {
                  const connectedCount = getRuknAssignmentSummary(officer.id).assignedKarkunCount
                  const connectedMuttafiqCount = getActiveMuttafiqRelationshipsForRukn(officer.id).length
                  return (
                  <tr key={officer.id} className={PEOPLE_TABLE_ROW_CLASS}>
                    <td className={PEOPLE_TABLE_CELL_CLASS}>
                      <Link
                        to={adminARuknDetailPath(officer.id)}
                        className="font-semibold text-text-heading hover:text-primary hover:underline"
                      >
                        {officer.id}
                      </Link>
                    </td>
                    <td className={PEOPLE_TABLE_CELL_CLASS}>
                      <Link
                        to={adminARuknDetailPath(officer.id)}
                        className="hover:text-primary hover:underline"
                      >
                        {formatPersonNameForDisplay(officer.name)}
                      </Link>
                    </td>
                    <td className={`${PEOPLE_TABLE_CELL_CLASS} text-secondary`}>
                      Connected Karkuns: {connectedCount}
                      <span className="block">Connected Muttafiqeen: {connectedMuttafiqCount}</span>
                    </td>
                    <td className={`${PEOPLE_TABLE_CELL_CLASS} text-secondary`}>
                      {officer.mobile || '—'}
                    </td>
                    <td className={PEOPLE_TABLE_CELL_CLASS}>
                      {officer.sourcePersonId ? (
                        <Link
                          to={adminKarkunProfilePath(officer.sourcePersonId)}
                          className="font-medium text-primary hover:underline"
                        >
                          {officer.sourcePersonId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={PEOPLE_TABLE_CELL_CLASS}>
                      <StatusBadge variant={officer.status === 'active' ? 'healthy' : 'dormant'}>
                        {formatPersonStatus(officer.status)}
                      </StatusBadge>
                    </td>
                    <td className={`${PEOPLE_TABLE_CELL_CLASS} text-secondary`}>
                      {formatDate(officer.createdAt)}
                    </td>
                    {isAdministrator ? (
                      <td className={PEOPLE_TABLE_CELL_CLASS}>
                        <button
                          type="button"
                          className="text-sm font-medium text-danger hover:underline disabled:opacity-60"
                          disabled={busy}
                          onClick={() => {
                            setError('')
                            setPendingDelete(officer)
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    ) : null}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-4 md:hidden">
            {officers.map((officer) => {
              const connectedCount = getRuknAssignmentSummary(officer.id).assignedKarkunCount
              const connectedMuttafiqCount = getActiveMuttafiqRelationshipsForRukn(officer.id).length
              return (
              <li
                key={officer.id}
                className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
              >
                <Link
                  to={adminARuknDetailPath(officer.id)}
                  className="font-semibold text-text-heading hover:underline"
                >
                  {officer.id}
                </Link>
                <p className="mt-1 text-text-heading">{formatPersonNameForDisplay(officer.name)}</p>
                <p className="mt-1 text-sm text-secondary">Connected Karkuns: {connectedCount}</p>
                <p className="mt-1 text-sm text-secondary">Connected Muttafiqeen: {connectedMuttafiqCount}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Mobile</dt>
                    <dd>{officer.mobile || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Source</dt>
                    <dd>
                      {officer.sourcePersonId ? (
                        <Link
                          to={adminKarkunProfilePath(officer.sourcePersonId)}
                          className="font-medium text-primary"
                        >
                          {officer.sourcePersonId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Status</dt>
                    <dd>{formatPersonStatus(officer.status)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Created</dt>
                    <dd>{formatDate(officer.createdAt)}</dd>
                  </div>
                </dl>
                {isAdministrator ? (
                  <button
                    type="button"
                    className="mt-3 text-sm font-medium text-danger hover:underline disabled:opacity-60"
                    disabled={busy}
                    onClick={() => {
                      setError('')
                      setPendingDelete(officer)
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </li>
              )
            })}
          </ul>
        </>
      )}

      <Modal
        isOpen={Boolean(pendingDelete) && !deleteMode}
        title={`Delete ${UI_LABELS.aRukn}?`}
        onClose={() => {
          if (busy) return
          setPendingDelete(null)
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Choose how to remove <strong>{pendingDelete?.id}</strong> (
            {pendingDelete ? formatPersonNameForDisplay(pendingDelete.name) : ''}). Historical
            campaign and connection records are preserved either way.
          </p>
          <div className="flex flex-col gap-2">
            <PrimaryButton
              type="button"
              onClick={() => setDeleteMode('restore_karkun')}
            >
              Restore as Normal Karkun
            </PrimaryButton>
            <SecondaryButton
              type="button"
              onClick={() => setDeleteMode('delete_permanently')}
            >
              Delete Permanently
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </SecondaryButton>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete) && Boolean(deleteMode)}
        title={
          deleteMode === 'restore_karkun'
            ? `Restore as Normal Karkun?`
            : `Delete ${UI_LABELS.aRukn} permanently?`
        }
        message={
          pendingDelete && deleteMode === 'restore_karkun' ? (
            <>
              Remove <strong>{pendingDelete.id}</strong> from the active {UI_LABELS.aRukn} registry
              and restore source Karkun <strong>{pendingDelete.sourcePersonId || '—'}</strong> as a
              normal Karkun. Promotion state is cleared. History is preserved. No referral or Rukn
              connection is invented.
            </>
          ) : pendingDelete ? (
            <>
              Permanently remove <strong>{pendingDelete.id}</strong> (
              {formatPersonNameForDisplay(pendingDelete.name)}) from the active {UI_LABELS.aRukn}{' '}
              registry. The officer document and history remain. The person is not restored as a
              normal Karkun. Historical campaign and connection records are not deleted.
            </>
          ) : (
            ''
          )
        }
        confirmLabel={deleteMode === 'restore_karkun' ? 'Restore as Normal Karkun' : 'Delete Permanently'}
        confirmLoading={busy}
        onConfirm={confirmDelete}
        onClose={() => {
          if (busy) return
          setDeleteMode(null)
        }}
      />
    </PageShell>
  )
}
