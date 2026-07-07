import { useEffect, useState } from 'react'
import {
  getCampaignHealthFromAnnexure1,
  getCampaignRecordData,
  getPerformanceMetricsFromAnnexure1,
} from '@/services/annexure1Service'
import { getFollowUpDashboardMetrics } from '@/services/followUpService'
import { getAllJihWebPortalSummaries } from '@/services/jihWebPortalService'
import { getAllBaitulMaalSummaries } from '@/services/baitulMaalService'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Link } from 'react-router-dom'
import { adminKarkunProfilePath } from '@/constants/routes'

export function ReviewReportsModulePage() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const unsubAnnexure = subscribeToAnnexure1Store(() => setVersion((value) => value + 1))
    const unsubFollowUp = subscribeToFollowUpStore(() => setVersion((value) => value + 1))
    const unsubJih = subscribeToJihWebPortalStore(() => setVersion((value) => value + 1))
    const unsubBaitulMaal = subscribeToBaitulMaalStore(() => setVersion((value) => value + 1))
    return () => {
      unsubAnnexure()
      unsubFollowUp()
      unsubJih()
      unsubBaitulMaal()
    }
  }, [])

  const campaignRecord = getCampaignRecordData()
  const campaignHealth = getCampaignHealthFromAnnexure1()
  const performanceMetrics = getPerformanceMetricsFromAnnexure1()
  const followUpMetrics = getFollowUpDashboardMetrics()
  const jihPortalSummaries = getAllJihWebPortalSummaries()
  const baitulMaalSummaries = getAllBaitulMaalSummaries()

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
        <h2 className="text-lg font-semibold text-text-heading">JIH Web Portal Compliance</h2>
        <p className="mt-1 text-sm text-secondary">
          Registration status and current month reporting for each Karkun.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-secondary">
                <th className="px-3 py-2 font-medium">Karkun</th>
                <th className="px-3 py-2 font-medium">Registration Status</th>
                <th className="px-3 py-2 font-medium">Current Month</th>
                <th className="px-3 py-2 font-medium">Reporting Status</th>
              </tr>
            </thead>
            <tbody>
              {jihPortalSummaries.map((summary) => (
                <tr key={summary.karkunId} className="border-b border-border/60">
                  <td className="px-3 py-3">
                    <Link
                      to={adminKarkunProfilePath(summary.karkunId)}
                      className="font-medium text-primary hover:underline"
                    >
                      {summary.karkunName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-text-heading">{summary.registration.status}</td>
                  <td className="px-3 py-3 text-text-heading">{summary.currentMonth}</td>
                  <td className="px-3 py-3 text-text-heading">
                    {summary.registration.status === 'Registered'
                      ? summary.monthlyStatus
                      : 'Not applicable'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Monthly Bait-ul-Maal Compliance</h2>
        <p className="mt-1 text-sm text-secondary">
          Current month payment status for each Karkun.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-secondary">
                <th className="px-3 py-2 font-medium">Karkun</th>
                <th className="px-3 py-2 font-medium">Month</th>
                <th className="px-3 py-2 font-medium">Year</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {baitulMaalSummaries.map((summary) => (
                <tr key={summary.karkunId} className="border-b border-border/60">
                  <td className="px-3 py-3">
                    <Link
                      to={adminKarkunProfilePath(summary.karkunId)}
                      className="font-medium text-primary hover:underline"
                    >
                      {summary.karkunName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-text-heading">
                    {new Date(summary.year, summary.month - 1, 1).toLocaleDateString('en-GB', {
                      month: 'long',
                    })}
                  </td>
                  <td className="px-3 py-3 text-text-heading">{summary.year}</td>
                  <td className="px-3 py-3 text-text-heading">{summary.status}</td>
                  <td className="px-3 py-3 text-text-heading">{summary.paymentDate ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
