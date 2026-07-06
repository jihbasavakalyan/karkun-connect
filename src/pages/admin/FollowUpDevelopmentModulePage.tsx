import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getCompletedFollowUps,
  getPendingFollowUps,
  getTodaysFollowUps,
} from '@/services/followUpService'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'

const sections = [
  { id: 'follow-ups', label: 'Pending Follow-ups' },
  { id: 'today', label: "Today's Follow-ups" },
  { id: 'completed', label: 'Completed Follow-ups' },
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

function FollowUpList({
  records,
  emptyMessage,
}: {
  records: ReturnType<typeof getPendingFollowUps>
  emptyMessage: string
}) {
  if (records.length === 0) {
    return <p className="text-sm text-secondary">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-3">
      {records.map((item) => (
        <li
          key={item.followUpId}
          className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
        >
          <p className="font-semibold text-text-heading">
            {item.karkunName} · {item.followUpDate} · {item.assignmentNumber}
          </p>
          <p className="mt-1 text-secondary">Purpose: {item.purpose}</p>
          {item.remarks && <p className="mt-1 text-secondary">Remarks: {item.remarks}</p>}
        </li>
      ))}
    </ul>
  )
}

export function FollowUpDevelopmentModulePage() {
  const [, setVersion] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const activeSection: FollowUpSection =
    sections.some((item) => item.id === sectionParam)
      ? (sectionParam as FollowUpSection)
      : 'follow-ups'

  useEffect(() => {
    return subscribeToFollowUpStore(() => setVersion((value) => value + 1))
  }, [])

  void setVersion

  const setSection = (section: FollowUpSection) => {
    setSearchParams({ section })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Follow-up</h1>
        <p className="mt-2 text-secondary">
          Simple follow-ups created from Annexure-1 when another interaction is needed.
        </p>
      </div>

      <SectionNav active={activeSection} onChange={setSection} />

      {activeSection === 'follow-ups' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Pending Follow-ups</h2>
          <div className="mt-4">
            <FollowUpList
              records={getPendingFollowUps()}
              emptyMessage="No pending follow-ups."
            />
          </div>
        </section>
      )}

      {activeSection === 'today' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Follow-ups</h2>
          <div className="mt-4">
            <FollowUpList
              records={getTodaysFollowUps()}
              emptyMessage="No follow-ups scheduled for today."
            />
          </div>
        </section>
      )}

      {activeSection === 'completed' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Completed Follow-ups</h2>
          <div className="mt-4">
            <FollowUpList
              records={getCompletedFollowUps()}
              emptyMessage="No completed follow-ups yet."
            />
          </div>
        </section>
      )}
    </div>
  )
}
