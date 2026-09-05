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
import { adminKarkunProfilePath } from '@/constants/routes'
import { listARuknOfficers } from '@/lib/aRuknRegistry'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { UI_LABELS } from '@/lib/uiTerminology'
import { formatPersonStatus } from '@/types/people.types'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'

function formatDate(value: string | undefined): string {
  if (!value?.trim()) return '—'
  return value.slice(0, 10)
}

export function ARuknRegistryPage() {
  const peopleVersion = usePeopleStore()
  const [search, setSearch] = useState('')

  const officers = useMemo(() => {
    const query = search.trim().toLowerCase()
    const rows = listARuknOfficers().slice().sort((a, b) => a.id.localeCompare(b.id))
    if (!query) return rows
    return rows.filter((officer) =>
      [officer.id, officer.name, officer.mobile, officer.sourcePersonId ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registry is module state
  }, [peopleVersion, search])

  return (
    <PageShell>
      <PageHeader
        title={UI_LABELS.aRukn}
        description="Independent officers promoted from Karkuns. This registry is separate from ارکان."
      />

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
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  )
}
