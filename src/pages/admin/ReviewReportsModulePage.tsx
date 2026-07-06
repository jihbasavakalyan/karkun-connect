import {
  MOCK_CAMPAIGN_HEALTH,
  MOCK_PERFORMANCE_METRICS,
} from '@/constants/mockCommandCenter'
import { getCampaignRecordData } from '@/constants/mockCampaignRecord'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

export function ReviewReportsModulePage() {
  const campaignRecord = getCampaignRecordData()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Review & Reports</h1>
        <p className="mt-2 text-secondary">
          Campaign health, performance review, and exports. No operational actions here.
        </p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Campaign Health</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-secondary">Overall Score</p>
            <p className="mt-1 text-3xl font-semibold text-primary">
              {MOCK_CAMPAIGN_HEALTH.overallScore}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-secondary">Visit Completion</p>
            <p className="mt-1 text-2xl font-semibold text-text-heading">
              {MOCK_CAMPAIGN_HEALTH.visitCompletionRate}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-secondary">Report Submission</p>
            <p className="mt-1 text-2xl font-semibold text-text-heading">
              {MOCK_CAMPAIGN_HEALTH.reportSubmissionRate}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-secondary">Follow-up Completion</p>
            <p className="mt-1 text-2xl font-semibold text-text-heading">
              {MOCK_CAMPAIGN_HEALTH.followUpCompletionRate}%
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Performance</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MOCK_PERFORMANCE_METRICS.map((metric) => (
            <li
              key={metric.id}
              className="rounded-lg border border-border bg-surface-muted px-4 py-3"
            >
              <p className="text-sm text-secondary">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold text-text-heading">{metric.value}</p>
              <p className="mt-1 text-xs text-primary">{metric.trend}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Charts</h2>
        <div className="mt-4 space-y-3">
          {[
            { label: 'Meetings', value: 68 },
            { label: 'Reports', value: 74 },
            { label: 'Follow-ups', value: 61 },
          ].map((chart) => (
            <div key={chart.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-secondary">{chart.label}</span>
                <span className="font-medium text-text-heading">{chart.value}%</span>
              </div>
              <div className="h-3 rounded-full bg-surface-muted">
                <div
                  className="h-3 rounded-full bg-primary"
                  style={{ width: `${chart.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Submitted Reports</h2>
        <ul className="mt-4 space-y-3">
          {campaignRecord.meetingForms.length === 0 ? (
            <li className="text-sm text-secondary">No submitted reports yet.</li>
          ) : (
            campaignRecord.meetingForms.map((form) => (
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
            ))
          )}
        </ul>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Export</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <SecondaryButton type="button">Export PDF</SecondaryButton>
          <SecondaryButton type="button">Export Excel</SecondaryButton>
        </div>
        <p className="mt-3 text-sm text-secondary">
          Export functionality will be enabled in a future sprint.
        </p>
      </section>
    </div>
  )
}
