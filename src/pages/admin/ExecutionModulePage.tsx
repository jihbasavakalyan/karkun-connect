import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ROUTES, adminAnnexure1Path } from '@/constants/routes'
import { ExecutionEmptyState } from '@/components/execution/ExecutionEmptyState'
import { ExecutionStatusBadge } from '@/components/execution/ExecutionStatusBadge'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import { ExecutionSummaryCards } from '@/components/execution/ExecutionSummaryCards'
import {
  getAnnexureActionLabel,
  getExecutionDashboardData,
  type ExecutionAssignmentItem,
} from '@/lib/executionStatus'
import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

const sections = [
  { id: 'action', label: 'Action Required' },
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'follow-up', label: 'Follow-up Required' },
  { id: 'completed-today', label: 'Completed Today' },
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

function AssignmentRow({ item }: { item: ExecutionAssignmentItem }) {
  const actionLabel = getAnnexureActionLabel(item.status)

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-text-heading">{item.karkunName}</p>
          <ExecutionStatusBadge status={item.status} />
        </div>
        <p className="mt-1 text-sm text-secondary">
          {item.area} · Rukn: {item.ruknName} · {item.assignmentNumber}
        </p>
      </div>
      <Link to={adminAnnexure1Path(item.karkunId)} className="shrink-0">
        <PrimaryButton type="button" className="w-full px-4 py-2 text-sm sm:w-auto">
          {actionLabel}
        </PrimaryButton>
      </Link>
    </li>
  )
}

function CompletedTodayRow({ form }: { form: SubmittedMeetingForm }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
      </div>
      <Link to={adminAnnexure1Path(form.karkunId)} className="shrink-0">
        <PrimaryButton type="button" className="w-full px-4 py-2 text-sm sm:w-auto">
          View Submission
        </PrimaryButton>
      </Link>
    </li>
  )
}

function resolveSection(sectionParam: string | null): ExecutionSection {
  if (sectionParam === 'meetings' || sectionParam === 'reports') {
    return 'action'
  }
  if (sections.some((item) => item.id === sectionParam)) {
    return sectionParam as ExecutionSection
  }
  return 'action'
}

function filterActiveItems(
  items: ExecutionAssignmentItem[],
  section: ExecutionSection,
): ExecutionAssignmentItem[] {
  switch (section) {
    case 'pending':
      return items.filter((item) => item.status === 'Pending')
    case 'in-progress':
      return items.filter((item) => item.status === 'In Progress')
    case 'follow-up':
      return items.filter((item) => item.status === 'Follow-up Required')
    case 'action':
      return items.filter((item) => item.status !== 'Completed')
    default:
      return []
  }
}

const EMPTY_STATES: Record<
  Exclude<ExecutionSection, 'completed-today'>,
  { title: string; message: string }
> = {
  action: {
    title: 'No Pending Executions',
    message: 'All assigned Karkuns have completed Annexure-1.',
  },
  pending: {
    title: 'No Pending Executions',
    message: 'All assigned Karkuns have started or completed Annexure-1.',
  },
  'in-progress': {
    title: 'Nothing In Progress',
    message: 'No Annexure-1 drafts are currently being worked on.',
  },
  'follow-up': {
    title: 'No Follow-ups Required',
    message: "You're all caught up.",
  },
}

export function ExecutionModulePage() {
  useAssignmentEngine()
  const [, setVersion] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection = resolveSection(searchParams.get('section'))

  useEffect(() => {
    const unsubAnnexure = subscribeToAnnexure1Store(() => setVersion((value) => value + 1))
    const unsubFollowUp = subscribeToFollowUpStore(() => setVersion((value) => value + 1))
    return () => {
      unsubAnnexure()
      unsubFollowUp()
    }
  }, [])

  const { counts, activeItems, completedTodayRecords } = getExecutionDashboardData()
  const filteredItems = filterActiveItems(activeItems, activeSection)

  const setSection = (section: ExecutionSection) => {
    setSearchParams({ section })
  }

  const sectionLabel = sections.find((item) => item.id === activeSection)?.label ?? 'Execution'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Execution</h1>
        <p className="mt-2 text-secondary">What requires action today.</p>
      </div>

      <ExecutionSuccessBanner />

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Execution</h2>
        <div className="mt-4">
          <ExecutionSummaryCards counts={counts} linkBase={ROUTES.ADMIN_EXECUTION} />
        </div>
      </section>

      <ExecutionSectionNav active={activeSection} onChange={setSection} />

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">{sectionLabel}</h2>

        {activeSection === 'completed-today' ? (
          completedTodayRecords.length === 0 ? (
            <div className="mt-4">
              <ExecutionEmptyState
                title="No Completions Today"
                message="Annexure-1 submissions completed today will appear here."
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {completedTodayRecords.map((form) => (
                <CompletedTodayRow key={form.id} form={form} />
              ))}
            </ul>
          )
        ) : filteredItems.length === 0 ? (
          <div className="mt-4">
            <ExecutionEmptyState {...EMPTY_STATES[activeSection]} />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {filteredItems.map((item) => (
              <AssignmentRow key={item.assignmentId} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
