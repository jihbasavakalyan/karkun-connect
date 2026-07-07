import { Link, useParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getRuknAssignmentSummary } from '@/services/assignmentService'
import { getAuditLogForPerson } from '@/lib/peopleAuditLog'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import { AssignmentHistoryTimeline } from '@/components/forms/assignment/AssignmentHistoryTimeline'
import { CommunicationActions } from '@/components/communication/CommunicationActions'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useCommunication } from '@/hooks/useCommunication'
import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import { formatPersonStatus } from '@/types/people.types'

export function RuknDetailPage() {
  const { ruknId } = useParams<{ ruknId: string }>()
  const rukn = ruknId ? getRuknById(ruknId) : undefined
  useAssignmentEngine()
  const { sendIndividualMessage } = useCommunication()
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
  const assignedKarkunNames = (summary?.activeAssignments ?? [])
    .map((assignment) => getKarkunById(assignment.karkunId)?.name)
    .filter((name): name is string => Boolean(name))

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
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-text-heading">Communication</p>
          <CommunicationActions
            personId={rukn.id}
            personKind="rukn"
            name={rukn.name}
            mobile={rukn.mobile}
            whatsapp={rukn.whatsapp}
            onSend={async (input) => {
              const result = await sendIndividualMessage({
                channel: 'whatsapp',
                recipient: {
                  personId: rukn.id,
                  personKind: 'rukn',
                  name: rukn.name,
                  mobile: rukn.mobile,
                  whatsapp: rukn.whatsapp,
                },
                templateId: input.templateId,
                message: input.message,
              })
              return result.success
                ? { success: true }
                : { success: false, error: result.error }
            }}
          />
        </div>
      </section>

      {summary && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-heading">Connection</h2>
            <Link to={adminAssignmentsPath({ ruknId: rukn.id })}>
              <PrimaryButton type="button" className="px-4 py-2 text-sm">
                ➕ Connect Karkun
              </PrimaryButton>
            </Link>
          </div>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-secondary">Connection Status</dt>
              <dd className="mt-1 font-medium text-text-heading">{getConnectionStatusLabel(summary.assignmentStatus)}</dd>
            </div>
            <div>
              <dt className="text-secondary">
                Connected Karkuns ({summary.assignedKarkunCount})
              </dt>
              <dd className="mt-1 font-medium text-text-heading">
                {assignedKarkunNames.length > 0 ? assignedKarkunNames.join(', ') : 'Not Connected'}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">Connection Since</dt>
              <dd className="mt-1 font-medium text-text-heading">
                {summary.assignmentSince?.slice(0, 10) ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">Last Connection Change</dt>
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
