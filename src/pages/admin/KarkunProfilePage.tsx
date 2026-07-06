import { Link, useParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getKarkunWorkloadSummary } from '@/services/assignmentService'
import { getNextFollowUpForKarkun } from '@/services/followUpService'
import { getAuditLogForPerson } from '@/lib/peopleAuditLog'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { ROUTES } from '@/constants/routes'
import {
  CAMPAIGN_STATUS_LABELS,
  JIH_STATUS_LABELS,
  VISIT_STATUS_LABELS,
} from '@/types/karkun-registry.types'
import { formatPersonStatus } from '@/types/people.types'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { useEffect, useState } from 'react'
import { AssignmentHistoryTimeline } from '@/components/forms/assignment/AssignmentHistoryTimeline'
import { CampaignStatusBadge } from '@/components/forms/karkunan/CampaignStatusBadge'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
      <dt className="text-sm text-secondary">{label}</dt>
      <dd className="mt-1 font-medium text-text-heading">{value}</dd>
    </div>
  )
}

export function KarkunProfilePage() {
  const { karkunId } = useParams<{ karkunId: string }>()
  const [, setVersion] = useState(0)
  useAssignmentEngine()

  useEffect(() => {
    return subscribeToFollowUpStore(() => setVersion((value) => value + 1))
  }, [])

  void setVersion

  const karkun = karkunId ? getKarkunById(karkunId) : undefined
  const auditLog = karkunId ? getAuditLogForPerson('karkun', karkunId) : []
  const workload = karkunId ? getKarkunWorkloadSummary(karkunId) : null
  const nextFollowUp = karkunId ? getNextFollowUpForKarkun(karkunId) : null

  if (!karkun) {
    return (
      <div className="mx-auto max-w-3xl rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-text-heading">Karkun Not Found</h1>
        <p className="mt-2 text-secondary">This profile does not exist in the registry.</p>
        <Link to={ROUTES.ADMIN_KARKUN} className="mt-6 inline-block">
          <SecondaryButton type="button">Back to Karkun</SecondaryButton>
        </Link>
      </div>
    )
  }

  const commitmentDisplay = karkun.currentCommitment.trim()
    ? karkun.currentCommitment
    : 'No commitment recorded.'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={ROUTES.ADMIN_KARKUN}
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to Karkun
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-text-heading">{karkun.name}</h1>
          <div className="mt-3">
            <CampaignStatusBadge status={karkun.campaignStatus} />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <SecondaryButton type="button">Edit</SecondaryButton>
          <SecondaryButton type="button">Visit History</SecondaryButton>
        </div>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Profile</h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <ProfileField label="Full Name" value={karkun.name} />
          <ProfileField label="Gender" value={karkun.gender} />
          <ProfileField label="Mobile" value={karkun.mobile} />
          <ProfileField label="WhatsApp" value={karkun.whatsapp ?? '—'} />
          <ProfileField label="Place" value={karkun.place} />
          <ProfileField label="Status" value={formatPersonStatus(karkun.status)} />
          <ProfileField label="Address" value={karkun.address || '—'} />
          <ProfileField label="Area" value={karkun.area} />
          <ProfileField label="Created Date" value={karkun.createdAt.slice(0, 10)} />
          <ProfileField label="Updated Date" value={karkun.updatedAt.slice(0, 10)} />
          <ProfileField label="Updated By" value={karkun.updatedBy} />
          <ProfileField
            label="Campaign Status"
            value={CAMPAIGN_STATUS_LABELS[karkun.campaignStatus]}
          />
          <ProfileField
            label="Administrator JIH Review"
            value={JIH_STATUS_LABELS[karkun.jihRegistration]}
          />
          <ProfileField label="Visit Status" value={VISIT_STATUS_LABELS[karkun.visitStatus]} />
          <ProfileField label="Last Meeting" value={karkun.lastVisit ?? '—'} />
        </dl>

        <div className="mt-4">
          <ProfileField label="Notes" value={karkun.notes || '—'} />
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Next Follow-up</h2>
        {nextFollowUp ? (
          <dl className="mt-4 space-y-4">
            <ProfileField label="Date" value={nextFollowUp.formattedDate} />
            <ProfileField label="Purpose" value={nextFollowUp.purpose} />
          </dl>
        ) : (
          <p className="mt-4 text-sm text-secondary">No follow-up scheduled.</p>
        )}
      </section>

      {workload && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Workload</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <ProfileField
              label="Assigned Rukns"
              value={workload.assignedRukns.length ? workload.assignedRukns.join(', ') : 'None'}
            />
            <ProfileField
              label="Current Active Assignments"
              value={String(workload.activeAssignments.length)}
            />
            <ProfileField
              label="Completed Assignments"
              value={String(workload.completedAssignments.length)}
            />
            <ProfileField
              label="Inactive Assignments"
              value={String(workload.inactiveAssignments.length)}
            />
          </dl>
        </section>
      )}

      {workload && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Assignment History</h2>
          <div className="mt-4">
            <AssignmentHistoryTimeline
              history={workload.activeAssignments.concat(
                workload.inactiveAssignments,
                workload.completedAssignments,
              )}
              currentAssignment={workload.activeAssignments[0] ?? null}
              perspective="karkun"
            />
          </div>
        </section>
      )}

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Meeting Outcomes</h2>
        <p className="mt-1 text-sm text-secondary">
          Latest commitment and JIH App registration from field meetings.
        </p>

        <dl className="mt-4 space-y-4">
          <ProfileField label="Current Commitment" value={commitmentDisplay} />
          <ProfileField
            label="JIH App Registration"
            value={karkun.jihAppRegistrationStatus}
          />
        </dl>
      </section>

      {auditLog.length > 0 && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
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
