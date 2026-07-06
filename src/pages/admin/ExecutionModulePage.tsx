import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MOCK_DAILY_PROGRESS_TIMELINE } from '@/constants/mockCommandCenter'
import {
  getAnnexure1ExecutionMetrics,
  getCampaignRecordData,
  getPendingReportKarkuns,
  getTodaysMeetingAssignments,
} from '@/services/annexure1Service'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'

const sections = [
  { id: 'meetings', label: "Today's Meetings" },
  { id: 'reports', label: 'Pending Annexure-1' },
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
  const activeSection: ExecutionSection =
    sections.some((item) => item.id === sectionParam)
      ? (sectionParam as ExecutionSection)
      : 'meetings'

  useEffect(() => {
    return subscribeToAnnexure1Store(() => setVersion((value) => value + 1))
  }, [])

  const campaignRecord = getCampaignRecordData()
  const metrics = getAnnexure1ExecutionMetrics()
  const todaysMeetings = getTodaysMeetingAssignments()
  const pendingReports = getPendingReportKarkuns()

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

      <ExecutionSectionNav active={activeSection} onChange={setSection} />

      {activeSection === 'meetings' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Meetings</h2>
          <ul className="mt-4 space-y-3">
            {todaysMeetings.length === 0 ? (
              <li className="text-sm text-secondary">
                All active assignments have Annexure-1 submitted for today.
              </li>
            ) : (
              todaysMeetings.map(({ assignment, karkun, rukn }) => (
                <li
                  key={assignment.assignmentId}
                  className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-text-heading">{karkun!.name}</p>
                  <p className="mt-1 text-secondary">
                    {karkun!.area} · Rukn: {rukn!.name} · {assignment.assignmentNumber}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {activeSection === 'reports' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Pending Annexure-1</h2>
          <p className="mt-2 text-3xl font-semibold text-primary">{metrics.pendingReports}</p>
          <ul className="mt-4 space-y-3">
            {pendingReports.length === 0 ? (
              <li className="text-sm text-secondary">All active assignments have Annexure-1 submitted.</li>
            ) : (
              pendingReports.map(({ assignment, karkun, rukn }) => (
                <li
                  key={assignment.assignmentId}
                  className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-text-heading">{karkun!.name}</p>
                  <p className="mt-1 text-secondary">
                    Annexure-1 pending · Rukn: {rukn!.name} · {assignment.assignmentNumber}
                  </p>
                </li>
              ))
            )}
          </ul>
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
                  className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-text-heading">
                    {form.workerName} · {form.visitDate} · {form.assignmentNumber}
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
