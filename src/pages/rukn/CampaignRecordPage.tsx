import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCampaignRecordData } from '@/services/annexure1Service'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { ROUTES } from '@/constants/routes'

function RecordSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function CampaignRecordPage() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const unsubAnnexure = subscribeToAnnexure1Store(() => setVersion((value) => value + 1))
    const unsubFollowUp = subscribeToFollowUpStore(() => setVersion((value) => value + 1))
    return () => {
      unsubAnnexure()
      unsubFollowUp()
    }
  }, [])

  const data = getCampaignRecordData()

  return (
    <div className="space-y-6 pb-24">
      <div>
        <Link to={ROUTES.RUKN} className="text-sm font-medium text-primary hover:underline">
          ← Back to Today&apos;s Mission
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-text-heading">Campaign Record</h1>
        <p className="mt-2 text-secondary">
          JIH Portal — latest Annexure-1 submissions for the active campaign.
        </p>
      </div>

      <RecordSection title="Annexure-1 Submissions">
        {data.meetingForms.length === 0 ? (
          <p className="text-sm text-secondary">No Annexure-1 forms submitted yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.meetingForms.map((form) => (
              <li
                key={form.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">
                  {form.workerName} · {form.visitDate} · {form.assignmentNumber}
                </p>
                <p className="mt-1 text-secondary">
                  Rukn: {form.assignedRukn} · Submitted {form.submissionDate.slice(0, 10)}
                </p>
                <p className="mt-1 text-secondary">
                  {form.visitConducted === 'yes'
                    ? form.discussionSummary || 'Annexure-1 submitted'
                    : `Not conducted: ${form.notConductedReason}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </RecordSection>

      <RecordSection title="Execution History">
        {data.visitHistory.length === 0 ? (
          <p className="text-sm text-secondary">No execution records yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.visitHistory.map((visit) => (
              <li
                key={visit.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">
                  {visit.workerName} · {visit.visitDate} · {visit.assignmentNumber}
                </p>
                <p className="mt-1 text-secondary">{visit.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </RecordSection>

      <RecordSection title="Commitments">
        {data.commitments.length === 0 ? (
          <p className="text-sm text-secondary">No commitments recorded.</p>
        ) : (
          <ul className="space-y-3">
            {data.commitments.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">
                  {item.workerName} · {item.visitDate} · {item.assignmentNumber}
                </p>
                <p className="mt-1 text-secondary">{item.details}</p>
              </li>
            ))}
          </ul>
        )}
      </RecordSection>

      <RecordSection title="JIH App Registration">
        {data.jihRegistrations.length === 0 ? (
          <p className="text-sm text-secondary">No JIH records.</p>
        ) : (
          <ul className="space-y-3">
            {data.jihRegistrations.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">
                  {item.workerName} · {item.visitDate} · {item.assignmentNumber}
                </p>
                <p className="mt-1 text-secondary">
                  {item.status} · Rukn: {item.ruknName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </RecordSection>

      <RecordSection title="Follow-ups">
        {data.followUps.length === 0 ? (
          <p className="text-sm text-secondary">No follow-ups scheduled.</p>
        ) : (
          <ul className="space-y-3">
            {data.followUps.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">
                  {item.workerName} · {item.followUpDate} · {item.assignmentNumber}
                </p>
                <p className="mt-1 text-secondary">
                  Purpose: {item.purpose ?? item.note}
                  {item.remarks ? ` · ${item.remarks}` : ''}
                  {item.status ? ` · ${item.status}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </RecordSection>
    </div>
  )
}
