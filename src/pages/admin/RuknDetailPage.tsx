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
import { useCommunication } from '@/hooks/useCommunication'
import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import { formatPersonStatus } from '@/types/people.types'
import { EmptyState, PageHeader, PageShell, Icon } from '@/components/ui'

export function RuknDetailPage() {
  const { ruknId } = useParams<{ ruknId: string }>()
  const rukn = ruknId ? getRuknById(ruknId) : undefined
  useAssignmentEngine()
  const { sendIndividualMessage } = useCommunication()
  const summary = ruknId ? getRuknAssignmentSummary(ruknId) : null

  if (!rukn) {
    return (
      <PageShell variant="narrow">
        <EmptyState
          icon="search"
          title="Rukn not found"
          description="This Rukn record does not exist or may have been removed."
          primaryAction={{ label: 'Back to Rukn', href: ROUTES.ADMIN_RUKN }}
        />
      </PageShell>
    )
  }

  const mobileLabel = rukn.mobile.trim() ? rukn.mobile : 'Mobile Not Added'
  const auditLog = getAuditLogForPerson('rukn', rukn.id)
  const assignedKarkunNames = (summary?.activeAssignments ?? [])
    .map((assignment) => getKarkunById(assignment.karkunId)?.name)
    .filter((name): name is string => Boolean(name))

  return (
    <PageShell variant="narrow" className="max-w-4xl">
      <Link to={ROUTES.ADMIN_RUKN} className="text-sm font-medium text-primary hover:underline">
        ← Back to Rukn
      </Link>
      <PageHeader
        title={rukn.name}
        description={`${rukn.gender} · ${rukn.place} · ${mobileLabel}`}
      />

      <section className="ds-section">
        <h2 className="ds-section-title">Contact</h2>
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
        <section className="ds-section">
          <div className="flex items-start justify-between gap-3">
            <h2 className="ds-section-title">Connection</h2>
            <Link to={adminAssignmentsPath({ ruknId: rukn.id })}>
              <PrimaryButton type="button" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm">
                <Icon name="plus" size="sm" />
                Connect Karkun
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
        <section className="ds-section">
          <h2 className="ds-section-title">Audit Log</h2>
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
    </PageShell>
  )
}
