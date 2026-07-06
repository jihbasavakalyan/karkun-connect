import { Link, useParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getRuknAssignmentSummary } from '@/services/assignmentService'
import { getAuditLogForPerson } from '@/lib/peopleAuditLog'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { ROUTES } from '@/constants/routes'
import { AssignmentHistoryTimeline } from '@/components/forms/assignment/AssignmentHistoryTimeline'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { formatPersonStatus } from '@/types/people.types'

export function RuknDetailPage() {
  const { ruknId } = useParams<{ ruknId: string }>()
  const rukn = ruknId ? getRuknById(ruknId) : undefined
  useAssignmentEngine()
  const summary = ruknId ? getRuknAssignmentSummary(ruknId) : null

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
  const currentKarkun = summary?.currentAssignment
    ? getKarkunById(summary.currentAssignment.karkunId)
    : null

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

      {summary && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-heading">Assignment</h2>
            <Link
              to={ROUTES.ADMIN_ASSIGNMENTS}
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage →
            </Link>
          </div>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-secondary">Assignment Status</dt>
              <dd className="mt-1 font-medium text-text-heading">{summary.assignmentStatus}</dd>
            </div>
            <div>
              <dt className="text-secondary">Current Assignment</dt>
              <dd className="mt-1 font-medium text-text-heading">
                {currentKarkun?.name ?? 'Unassigned'}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">Assignment Since</dt>
              <dd className="mt-1 font-medium text-text-heading">
                {summary.assignmentSince?.slice(0, 10) ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">Last Assignment Change</dt>
              <dd className="mt-1 font-medium text-text-heading">
                {summary.lastAssignmentChange?.slice(0, 10) ?? '—'}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <AssignmentHistoryTimeline
              history={summary.assignmentHistory}
              currentAssignment={summary.currentAssignment}
              perspective="rukn"
            />
          </div>
        </section>
      )}

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
