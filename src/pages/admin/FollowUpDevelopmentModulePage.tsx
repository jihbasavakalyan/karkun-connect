import { useSearchParams } from 'react-router-dom'
import { getCampaignRecordData } from '@/constants/mockCampaignRecord'
import {
  MOCK_FOLLOW_UP_TASKS,
  MOCK_IMPROVEMENT_TASKS,
  MOCK_RESPONSIBILITIES,
  MOCK_TRAINING_ITEMS,
} from '@/constants/mockCommandCenter'

const sections = [
  { id: 'follow-ups', label: 'Pending Follow-ups' },
  { id: 'responsibilities', label: 'Assigned Responsibilities' },
  { id: 'training', label: 'Training Items' },
  { id: 'improvement', label: 'Improvement Tasks' },
] as const

type FollowUpSection = (typeof sections)[number]['id']

function SectionNav({
  active,
  onChange,
}: {
  active: FollowUpSection
  onChange: (section: FollowUpSection) => void
}) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Follow-up sections">
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

export function FollowUpDevelopmentModulePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const activeSection: FollowUpSection =
    sections.some((item) => item.id === sectionParam)
      ? (sectionParam as FollowUpSection)
      : 'follow-ups'

  const campaignFollowUps = getCampaignRecordData().followUps

  const setSection = (section: FollowUpSection) => {
    setSearchParams({ section })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Follow-up & Development</h1>
        <p className="mt-2 text-secondary">
          Follow-ups, responsibilities, training, and continuous improvement.
        </p>
      </div>

      <SectionNav active={activeSection} onChange={setSection} />

      {activeSection === 'follow-ups' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Pending Follow-ups</h2>
          <ul className="mt-4 space-y-3">
            {MOCK_FOLLOW_UP_TASKS.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">{item.karkunName}</p>
                <p className="mt-1 text-secondary">
                  {item.dueDate} · {item.note}
                </p>
              </li>
            ))}
            {campaignFollowUps.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">{item.workerName}</p>
                <p className="mt-1 text-secondary">
                  {item.followUpDate}
                  {item.note ? ` · ${item.note}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeSection === 'responsibilities' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Assigned Responsibilities</h2>
          <ul className="mt-4 space-y-3">
            {MOCK_RESPONSIBILITIES.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">{item.title}</p>
                <p className="mt-1 text-secondary">
                  Rukn: {item.assignee} · Due {item.dueDate}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeSection === 'training' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Training Items</h2>
          <ul className="mt-4 space-y-3">
            {MOCK_TRAINING_ITEMS.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">{item.title}</p>
                <p className="mt-1 text-secondary">
                  {item.status} · {item.date}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeSection === 'improvement' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Improvement Tasks</h2>
          <ul className="mt-4 space-y-3">
            {MOCK_IMPROVEMENT_TASKS.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <p className="font-semibold text-text-heading">{item.title}</p>
                <p className="mt-1 text-secondary">Priority: {item.priority}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
