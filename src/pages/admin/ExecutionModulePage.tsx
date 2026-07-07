import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MOCK_DAILY_PROGRESS_TIMELINE } from '@/constants/mockCommandCenter'
import { adminAnnexure1Path } from '@/constants/routes'
import { ExecutionStatusBadge } from '@/components/execution/ExecutionStatusBadge'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import {
  getAnnexureActionLabel,
  getExecutionStatusForAssignment,
} from '@/lib/executionStatus'
import {
  getAnnexure1ExecutionMetrics,
  getCampaignRecordData,
  getPendingReportKarkuns,
  getTodaysMeetingAssignments,
} from '@/services/annexure1Service'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

const sections = [
  { id: 'pending', label: 'Pending Execution' },
  { id: 'completed', label: 'Completed Annexure-1' },
  { id: 'progress', label: 'Daily Progress Timeline' },
] as const

type ExecutionSection = (typeof sections)[number]['id']

function ExecutionSectionNav({
  active,
  onChange,
}: {
  active: ExecutionSection
  onChange: (section: ExecutionSection) => void
}) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Execution sections">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onChange(section.id)}
          className={[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            active === section.id
              ? 'bg-primary-muted text-primary'
              : 'bg-surface text-secondary hover:bg-surface-muted hover:text-text-heading',
          ].join(' ')}
        >
          {section.label}
        </button>
      ))}
    </nav>
  )
}

export function ExecutionModulePage() {
  useAssignmentEngine()
  const [, setVersion] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const legacySection =
    sectionParam === 'meetings' || sectionParam === 'reports' ? 'pending' : sectionParam
  const activeSection: ExecutionSection =
    sections.some((item) => item.id === legacySection)
      ? (legacySection as ExecutionSection)
      : 'pending'

  useEffect(() => {
    const unsubAnnexure = subscribeToAnnexure1Store(() => setVersion((value) => value + 1))
    const unsubFollowUp = subscribeToFollowUpStore(() => setVersion((value) => value + 1))
    return () => {
      unsubAnnexure()
      unsubFollowUp()
    }
  }, [])

  const campaignRecord = getCampaignRecordData()
  const metrics = getAnnexure1ExecutionMetrics()
  const todaysMeetings = getTodaysMeetingAssignments()
  const pendingReports = getPendingReportKarkuns()

  const pendingExecution = useMemo(() => {
    const byAssignment = new Map<
      string,
      (typeof todaysMeetings)[number] | (typeof pendingReports)[number]
    >()

    for (const item of pendingReports) {
      byAssignment.set(item.assignment.assignmentId, item)
    }
    for (const item of todaysMeetings) {
      byAssignment.set(item.assignment.assignmentId, item)
    }

    return [...byAssignment.values()]
  }, [pendingReports, todaysMeetings])

  const setSection = (section: ExecutionSection) => {
    setSearchParams({ section })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Execution</h1>
        <p className="mt-2 text-secondary">
          Operational workspace driven by Annexure-1 submissions.
        </p>
      </div>

      <ExecutionSuccessBanner />
      <ExecutionSectionNav active={activeSection} onChange={setSection} />

      {activeSection === 'pending' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Pending Execution</h2>
              <p className="mt-1 text-sm text-secondary">
                Active assignments awaiting today&apos;s Annexure-1 or first submission.
              </p>
            </div>
            <p className="text-3xl font-semibold text-primary">{pendingExecution.length}</p>
          </div>
          <ul className="mt-4 space-y-3">
            {pendingExecution.length === 0 ? (
              <li className="text-sm text-secondary">
                All active assignments are up to date.
              </li>
            ) : (
              pendingExecution.map(({ assignment, karkun, rukn }) => {
                const status = getExecutionStatusForAssignment(
                  assignment.assignmentId,
                  assignment.karkunId,
                )
                const actionLabel = getAnnexureActionLabel(status)

                return (
                  <li
                    key={assignment.assignmentId}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-text-heading">{karkun!.name}</p>
                        <ExecutionStatusBadge status={status} />
                      </div>
                      <p className="mt-1 text-sm text-secondary">
                        {karkun!.area} · Rukn: {rukn!.name} · {assignment.assignmentNumber}
                      </p>
                    </div>
                    <Link to={adminAnnexure1Path(assignment.karkunId)} className="shrink-0">
                      <PrimaryButton type="button" className="w-full px-4 py-2 text-sm sm:w-auto">
                        {actionLabel}
                      </PrimaryButton>
                    </Link>
                  </li>
                )
              })
            )}
          </ul>
          <p className="mt-4 text-xs text-secondary">
            {metrics.pendingMeetings} pending today · {metrics.pendingReports} never submitted
          </p>
        </section>
      )}

      {activeSection === 'completed' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Completed Annexure-1</h2>
          <ul className="mt-4 space-y-3">
            {campaignRecord.meetingForms.length === 0 ? (
              <li className="text-sm text-secondary">No Annexure-1 submissions recorded.</li>
            ) : (
              campaignRecord.meetingForms.map((form) => (
                <li
                  key={form.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-text-heading">
                        {form.workerName} · {form.visitDate}
                      </p>
                      <ExecutionStatusBadge status="Completed" />
                    </div>
                    <p className="mt-1 text-sm text-secondary">
                      {form.assignmentNumber} · Rukn: {form.assignedRukn}
                    </p>
                    <p className="mt-1 text-sm text-secondary">
                      {form.visitConducted === 'yes'
                        ? form.discussionSummary || 'Annexure-1 submitted'
                        : `Not conducted: ${form.notConductedReason}`}
                    </p>
                  </div>
                  <Link to={adminAnnexure1Path(form.karkunId)} className="shrink-0">
                    <PrimaryButton type="button" className="w-full px-4 py-2 text-sm sm:w-auto">
                      View Submission
                    </PrimaryButton>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {activeSection === 'progress' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Daily Progress Timeline</h2>
          <ul className="mt-4 space-y-3">
            {MOCK_DAILY_PROGRESS_TIMELINE.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">{entry.date}</p>
                <p className="mt-1 text-secondary">{entry.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
