import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import {
  getAssignedKarkunanForRukn,
  getCompletedAssignmentHistoryForRukn,
} from '@/lib/assignmentEngine'
import { getAuditLogForPerson } from '@/lib/peopleAuditLog'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { formatPersonStatus } from '@/types/people.types'
import { ROUTES } from '@/constants/routes'
import { AssignedKarkunList } from '@/components/forms/rukn'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

export function RuknDetailPage() {
  const { ruknId } = useParams<{ ruknId: string }>()
  const rukn = ruknId ? getRuknById(ruknId) : undefined
  useAssignmentEngine()
  const assignedKarkunan = useMemo(
    () => (ruknId ? getAssignedKarkunanForRukn(ruknId) : []),
    [ruknId],
  )
  const assignmentHistory = useMemo(
    () => (ruknId ? getCompletedAssignmentHistoryForRukn(ruknId) : []),
    [ruknId],
  )

  if (!rukn) {
    return (
      <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-text-heading">Rukn Not Found</h1>
        <Link to={ROUTES.ADMIN_RUKN} className="mt-6 inline-block">
          <SecondaryButton type="button">Back to Rukn</SecondaryButton>
        </Link>
      </div>
    )
  }

  const mobileLabel = rukn.mobile.trim() ? rukn.mobile : 'Mobile Not Added'
  const auditLog = getAuditLogForPerson('rukn', rukn.id)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to={ROUTES.ADMIN_RUKN} className="text-sm font-medium text-primary hover:underline">
          ← Back to Rukn
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-text-heading">{rukn.name}</h1>
        <p className="mt-2 text-secondary">
          {rukn.gender} · {rukn.place} · {mobileLabel}
        </p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Contact</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-secondary">WhatsApp</dt>
            <dd className="mt-1 font-medium text-text-heading">{rukn.whatsapp ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-secondary">Status</dt>
            <dd className="mt-1 font-medium text-text-heading">{formatPersonStatus(rukn.status)}</dd>
          </div>
          <div>
            <dt className="text-secondary">Created</dt>
            <dd className="mt-1 font-medium text-text-heading">{rukn.createdAt.slice(0, 10)}</dd>
          </div>
          <div>
            <dt className="text-secondary">Updated</dt>
            <dd className="mt-1 font-medium text-text-heading">
              {rukn.updatedAt.slice(0, 10)} by {rukn.updatedBy}
            </dd>
          </div>
        </dl>
        {rukn.notes && (
          <p className="mt-4 text-sm text-secondary">
            <span className="font-medium text-text-heading">Notes: </span>
            {rukn.notes}
          </p>
        )}
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Current Assignment</h2>
        <p className="mt-1 text-sm text-secondary">
          Karkun currently assigned to this Rukn.
        </p>
        <div className="mt-4">
          {assignedKarkunan.length === 0 ? (
            <p className="text-sm text-secondary">No Karkun currently assigned.</p>
          ) : (
            <AssignedKarkunList karkunan={assignedKarkunan} />
          )}
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Assignment History</h2>

        {assignmentHistory.length === 0 ? (
          <p className="mt-4 text-sm text-secondary">No previous assignments recorded.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {assignmentHistory.map((record) => (
              <li
                key={record.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-medium text-text-heading">
                  {getKarkunById(record.karkunId)?.name ?? record.karkunId}
                </p>
                <p className="mt-1 text-secondary">
                  {record.assignmentDate}
                  {record.releasedAt ? ` → released ${record.releasedAt.slice(0, 10)}` : ''}
                  {record.releaseReason ? ` · ${record.releaseReason}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {auditLog.length > 0 && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Audit Log</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {auditLog.slice(0, 10).map((entry) => (
              <li key={entry.id} className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                <span className="font-medium text-text-heading">{entry.action}</span>
                <span className="text-secondary">
                  {' '}
                  · {entry.timestamp.slice(0, 16).replace('T', ' ')} · {entry.updatedBy}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
