import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import { adminAnnexure1Path } from '@/constants/routes'
import { ExecutionEmptyState } from '@/components/execution/ExecutionEmptyState'
import { ExecutionStatusBadge } from '@/components/execution/ExecutionStatusBadge'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import {
  completeFollowUpById,
  getCompletedFollowUps,
  getPendingFollowUps,
  getTodaysFollowUps,
} from '@/services/followUpService'
import type { FollowUpRecord } from '@/types/followUp'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

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
  emptyTitle,
  emptyMessage,
  showActions,
  onComplete,
}: {
  records: FollowUpRecord[]
  emptyTitle: string
  emptyMessage: string
  showActions: boolean
  onComplete: (followUpId: string) => void
}) {
  if (records.length === 0) {
    return <ExecutionEmptyState title={emptyTitle} message={emptyMessage} />
  }

  return (
    <ul className="space-y-3">
      {records.map((item) => (
        <li
          key={item.followUpId}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-text-heading">{item.karkunName}</p>
              <ExecutionStatusBadge
                status={item.status === 'Completed' ? 'Completed' : 'Follow-up Required'}
              />
            </div>
            <p className="mt-1 text-sm text-secondary">
              {item.followUpDate} · {item.assignmentNumber}
            </p>
            <p className="mt-1 text-sm text-secondary">Purpose: {item.purpose}</p>
          </div>

          {showActions && (
            <div className="flex shrink-0 flex-col gap-2 sm:w-48">
              <Link to={adminAnnexure1Path(item.karkunId)}>
                <PrimaryButton type="button" fullWidth className="px-4 py-2 text-sm">
                  Open Connection
                </PrimaryButton>
              </Link>
              <SecondaryButton
                type="button"
                fullWidth
                className="px-4 py-2 text-sm"
                onClick={() => onComplete(item.followUpId)}
              >
                Mark Complete
              </SecondaryButton>
            </div>
          )}
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

  const handleComplete = (followUpId: string) => {
    completeFollowUpById(followUpId)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Follow-up</h1>
        <ActiveCampaignSubtitle />
        <p className="mt-2 text-secondary">
          Simple follow-ups created from a visit when another interaction is needed.
        </p>
      </div>

      <ExecutionSuccessBanner />
      <SectionNav active={activeSection} onChange={setSection} />

      {activeSection === 'follow-ups' && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Pending Follow-ups</h2>
          <div className="mt-4">
            <FollowUpList
              records={getPendingFollowUps()}
              emptyTitle="No Follow-ups Scheduled"
              emptyMessage="You're all caught up."
              showActions
              onComplete={handleComplete}
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
              emptyTitle="No Follow-ups Today"
              emptyMessage="No follow-ups are scheduled for today."
              showActions
              onComplete={handleComplete}
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
              emptyTitle="No Completed Follow-ups"
              emptyMessage="Completed follow-ups will appear here."
              showActions={false}
              onComplete={handleComplete}
            />
          </div>
        </section>
      )}
    </div>
  )
}
