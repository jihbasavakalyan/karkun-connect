import { useSearchParams } from 'react-router-dom'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getCampaignRecordData } from '@/constants/mockCampaignRecord'
import { MOCK_DAILY_PROGRESS_TIMELINE } from '@/constants/mockCommandCenter'
import { MOCK_NEEDS_ATTENTION } from '@/constants/mockMissions'
import { VISIT_STATUS_LABELS } from '@/types/karkun-registry.types'

const sections = [
  { id: 'meetings', label: "Today's Meetings" },
  { id: 'reports', label: 'Pending Reports' },
  { id: 'completed', label: 'Completed Meetings' },
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
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const activeSection: ExecutionSection =
    sections.some((item) => item.id === sectionParam)
      ? (sectionParam as ExecutionSection)
      : 'meetings'

  const campaignRecord = getCampaignRecordData()
  const todaysMeetings = MOCK_KARKUN_REGISTRY.filter(
    (karkun) =>
      !karkun.isArchived &&
      (karkun.visitStatus === 'scheduled' || karkun.visitStatus === 'pending'),
  )

  const setSection = (section: ExecutionSection) => {
    setSearchParams({ section })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Execution</h1>
        <p className="mt-2 text-secondary">
          Operational workspace for meetings, reports, and daily progress.
        </p>
      </div>

      <ExecutionSectionNav active={activeSection} onChange={setSection} />

      {activeSection === 'meetings' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Meetings</h2>
          <ul className="mt-4 space-y-3">
            {todaysMeetings.length === 0 ? (
              <li className="text-sm text-secondary">No meetings scheduled for today.</li>
            ) : (
              todaysMeetings.map((karkun) => (
                <li
                  key={karkun.id}
                  className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-text-heading">{karkun.name}</p>
                  <p className="mt-1 text-secondary">
                    {karkun.area} · Rukn: {karkun.assignedRukn} ·{' '}
                    {VISIT_STATUS_LABELS[karkun.visitStatus]}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {activeSection === 'reports' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Pending Reports</h2>
          <p className="mt-2 text-3xl font-semibold text-primary">
            {MOCK_NEEDS_ATTENTION.pendingReports}
          </p>
          <ul className="mt-4 space-y-3">
            {MOCK_KARKUN_REGISTRY.filter(
              (karkun) => karkun.visitStatus === 'completed' && karkun.campaignStatus === 'active',
            )
              .slice(0, 5)
              .map((karkun) => (
                <li
                  key={karkun.id}
                  className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-text-heading">{karkun.name}</p>
                  <p className="mt-1 text-secondary">
                    Report pending · Last visit {karkun.lastVisit ?? '—'}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      )}

      {activeSection === 'completed' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Completed Meetings</h2>
          <ul className="mt-4 space-y-3">
            {campaignRecord.visitHistory.length === 0 ? (
              <li className="text-sm text-secondary">No completed meetings recorded.</li>
            ) : (
              campaignRecord.visitHistory.map((visit) => (
                <li
                  key={visit.id}
                  className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-text-heading">
                    {visit.workerName} · {visit.visitDate}
                  </p>
                  <p className="mt-1 text-secondary">{visit.summary}</p>
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
