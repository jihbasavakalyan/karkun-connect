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
import { adminKarkunProfilePath } from '@/constants/routes'
import { listActiveARuknOfficers } from '@/lib/aRuknRegistry'
import { useAuth } from '@/hooks/useAuth'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import { UI_LABELS } from '@/lib/uiTerminology'
import { deactivateARuknOfficer } from '@/services/archiveService'
import { formatPersonStatus } from '@/types/people.types'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'
import type { Rukn } from '@/data/ruknMaster'

function formatDate(value: string | undefined): string {
  if (!value?.trim()) return '—'
  return value.slice(0, 10)
}

export function ARuknRegistryPage() {
  const peopleVersion = usePeopleStore()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Rukn | null>(null)
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
  }, [peopleVersion, search])

  const decidedBy = user?.displayName ?? user?.uid ?? 'Administrator'

  const confirmDelete = () => {
    const officer = pendingDelete
    if (!officer || busy) return
    setError('')
    setNotice('')
    void run({
      key: `a-rukn:deactivate:${officer.id}`,
      queueLabels: ['rukns'],
      work: async () => {
        const result = await deactivateARuknOfficer({
          aRuknId: officer.id,
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
      setNotice(`${officer.id} removed from the active ${UI_LABELS.aRukn} registry.`)
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
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Mobile</th>
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Source Karkun</th>
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Status</th>
                  <th className={PEOPLE_TABLE_CELL_CLASS}>Created</th>
                  {isAdministrator ? <th className={PEOPLE_TABLE_CELL_CLASS}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {officers.map((officer) => (
                  <tr key={officer.id} className={PEOPLE_TABLE_ROW_CLASS}>
                    <td className={PEOPLE_TABLE_CELL_CLASS}>
                      <span className="font-semibold text-text-heading">{officer.id}</span>
                    </td>
                    <td className={PEOPLE_TABLE_CELL_CLASS}>
                      {formatPersonNameForDisplay(officer.name)}
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
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-4 md:hidden">
            {officers.map((officer) => (
              <li
                key={officer.id}
                className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
              >
                <p className="font-semibold text-text-heading">{officer.id}</p>
                <p className="mt-1 text-text-heading">{formatPersonNameForDisplay(officer.name)}</p>
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
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={`Delete ${UI_LABELS.aRukn}?`}
        message={
          pendingDelete ? (
            <>
              Remove <strong>{pendingDelete.id}</strong> ({formatPersonNameForDisplay(pendingDelete.name)})
              from the active {UI_LABELS.aRukn} registry? The officer document and source Karkun
              remain preserved. Historical records are not deleted. The person is not restored as a
              normal Karkun.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Delete"
        confirmLoading={busy}
        onConfirm={confirmDelete}
        onClose={() => {
          if (busy) return
          setPendingDelete(null)
        }}
      />
    </PageShell>
  )
}
