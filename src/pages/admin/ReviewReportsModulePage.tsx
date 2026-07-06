import { useEffect, useState } from 'react'
import {
  getCampaignHealthFromAnnexure1,
  getCampaignRecordData,
  getPerformanceMetricsFromAnnexure1,
} from '@/services/annexure1Service'
import { getFollowUpDashboardMetrics } from '@/services/followUpService'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

export function ReviewReportsModulePage() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const unsubAnnexure = subscribeToAnnexure1Store(() => setVersion((value) => value + 1))
    const unsubFollowUp = subscribeToFollowUpStore(() => setVersion((value) => value + 1))
    return () => {
      unsubAnnexure()
      unsubFollowUp()
    }
  }, [])

  const campaignRecord = getCampaignRecordData()
  const campaignHealth = getCampaignHealthFromAnnexure1()
  const performanceMetrics = getPerformanceMetricsFromAnnexure1()
  const followUpMetrics = getFollowUpDashboardMetrics()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Review & Reports</h1>
        <p className="mt-2 text-secondary">
          Campaign health and performance derived from Annexure-1 submissions.
        </p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Campaign Health</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-secondary">Overall Score</p>
            <p className="mt-1 text-3xl font-semibold text-primary">
              {campaignHealth.overallScore}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-secondary">Annexure-1 Completion</p>
            <p className="mt-1 text-2xl font-semibold text-text-heading">
              {campaignHealth.visitCompletionRate}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-secondary">Report Submission</p>
            <p className="mt-1 text-2xl font-semibold text-text-heading">
              {campaignHealth.reportSubmissionRate}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-secondary">Follow-up Completion</p>
            <p className="mt-1 text-2xl font-semibold text-text-heading">
              {campaignHealth.followUpCompletionRate}%
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Performance</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {performanceMetrics.map((metric) => (
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
        <h2 className="text-lg font-semibold text-text-heading">Follow-ups</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-secondary">Follow-up Pending</p>
            <p className="mt-1 text-3xl font-semibold text-primary">
              {followUpMetrics.pendingFollowUps}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-secondary">Follow-up Completed</p>
            <p className="mt-1 text-3xl font-semibold text-text-heading">
              {followUpMetrics.completedFollowUps}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Annexure-1 Reports</h2>
        <p className="mt-1 text-sm text-secondary">
          Submitted Annexure-1 forms are the report source. No duplicate reporting required.
        </p>
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
      </section>
    </div>
  )
}
