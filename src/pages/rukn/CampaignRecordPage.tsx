import { Link } from 'react-router-dom'
import { getCampaignRecordData } from '@/constants/mockCampaignRecord'
import { JIH_STATUS_LABELS } from '@/types/annexure1.types'
import type { JihRegistrationChoice } from '@/types/annexure1.types'
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
  const data = getCampaignRecordData()

  return (
    <div className="space-y-6 pb-24">
      <div>
        <Link to={ROUTES.RUKN} className="text-sm font-medium text-primary hover:underline">
          ← Back to Today&apos;s Mission
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-text-heading">Campaign Record</h1>
        <p className="mt-2 text-secondary">Submitted visit and meeting data for the active campaign.</p>
      </div>

      <RecordSection title="Visit History">
        {data.visitHistory.length === 0 ? (
          <p className="text-sm text-secondary">No visits recorded.</p>
        ) : (
          <ul className="space-y-3">
            {data.visitHistory.map((visit) => (
              <li
                key={visit.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">
                  {visit.workerName} · {visit.visitDate}
                </p>
                <p className="mt-1 text-secondary">{visit.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </RecordSection>

      <RecordSection title="Meeting Forms">
        {data.meetingForms.length === 0 ? (
          <p className="text-sm text-secondary">No forms submitted.</p>
        ) : (
          <ul className="space-y-3">
            {data.meetingForms.map((form) => (
              <li
                key={form.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">
                  {form.workerName} · {form.visitDate}
                </p>
                <p className="mt-1 text-secondary">
                  {form.visitConducted === 'yes'
                    ? form.discussionSummary || 'Visit completed'
                    : `Not conducted: ${form.notConductedReason}`}
                </p>
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
                  {item.workerName} · {item.visitDate}
                </p>
                <p className="mt-1 text-secondary">{item.details}</p>
              </li>
            ))}
          </ul>
        )}
      </RecordSection>

      <RecordSection title="JIH Registration">
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
                  {item.workerName} · {item.visitDate}
                </p>
                <p className="mt-1 text-secondary">
                  {JIH_STATUS_LABELS[item.status as JihRegistrationChoice]}
                </p>
                {item.note && <p className="mt-1 text-secondary">{item.note}</p>}
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
                  {item.workerName} · {item.followUpDate}
                </p>
                <p className="mt-1 text-secondary">{item.note || 'Follow-up scheduled'}</p>
              </li>
            ))}
          </ul>
        )}
      </RecordSection>
    </div>
  )
}
