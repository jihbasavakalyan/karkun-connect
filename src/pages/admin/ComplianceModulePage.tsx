import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ComplianceSummaryCards } from '@/components/compliance/ComplianceSummaryCards'
import { ExecutionEmptyState } from '@/components/execution/ExecutionEmptyState'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import { ROUTES, adminKarkunProfilePath } from '@/constants/routes'
import {
  COMPLIANCE_SECTIONS,
  getPendingStatusLabel,
  normalizeComplianceStatus,
  resolveComplianceSection,
  resolveComplianceViewFilter,
  type ComplianceSection,
} from '@/lib/complianceNavigation'
import {
  getAllBaitulMaalSummaries,
  getBaitulMaalDashboardMetrics,
  updateBaitulMaal,
} from '@/services/baitulMaalService'
import {
  getAllIjtemaAttendanceSummaries,
  getIjtemaAttendanceDashboardMetrics,
  updateIjtemaAttendance,
} from '@/services/ijtemaAttendanceService'
import {
  getAllJihWebPortalSummaries,
  getJihWebPortalDashboardMetrics,
  updateJihMonthlyReport,
  updateJihRegistration,
} from '@/services/jihWebPortalService'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import type { BaitulMaalKarkunSummary } from '@/types/baitulMaal'
import type { IjtemaAttendanceKarkunSummary, IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'
import type { JihWebPortalKarkunSummary } from '@/types/jihWebPortal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function ComplianceSectionNav({
  active,
  statusFilter,
  onChange,
}: {
  active: ComplianceSection
  statusFilter: string
  onChange: (section: ComplianceSection) => void
}) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Compliance sections">
      {COMPLIANCE_SECTIONS.map((section) => (
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
      {statusFilter && (
        <span className="self-center rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-secondary">
          Filter: {statusFilter}
        </span>
      )}
    </nav>
  )
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-secondary">
      {label}
    </span>
  )
}

function filterIjtemaItems(
  items: IjtemaAttendanceKarkunSummary[],
  statusFilter: string,
): IjtemaAttendanceKarkunSummary[] {
  if (!statusFilter) {
    return items
  }
  if (statusFilter === 'Not recorded') {
    return items.filter((item) => item.status === 'Not recorded')
  }
  return items.filter((item) => item.status === statusFilter)
}

function filterJihRegistrationItems(
  items: JihWebPortalKarkunSummary[],
  statusFilter: string,
): JihWebPortalKarkunSummary[] {
  if (!statusFilter) {
    return items
  }
  return items.filter((item) => item.registration.status === statusFilter)
}

function filterMonthlyReportingItems(
  items: JihWebPortalKarkunSummary[],
  statusFilter: string,
): JihWebPortalKarkunSummary[] {
  const registered = items.filter((item) => item.registration.status === 'Registered')
  if (!statusFilter) {
    return registered
  }
  return registered.filter((item) => item.monthlyStatus === statusFilter)
}

function filterBaitulMaalItems(
  items: BaitulMaalKarkunSummary[],
  statusFilter: string,
): BaitulMaalKarkunSummary[] {
  if (!statusFilter) {
    return items
  }
  return items.filter((item) => item.status === statusFilter)
}

const EMPTY_MESSAGES: Record<ComplianceSection, { title: string; message: string }> = {
  ijtema: {
    title: 'No Matching Ijtema Records',
    message: "You're all caught up for this week's attendance filter.",
  },
  'jih-registration': {
    title: 'No Matching Registration Records',
    message: 'All Karkuns match the selected registration filter.',
  },
  'monthly-reporting': {
    title: 'No Matching Monthly Reports',
    message: 'All registered Karkuns match the selected reporting filter.',
  },
  'baitul-maal': {
    title: 'No Matching Bait-ul-Maal Records',
    message: 'All Karkuns match the selected payment filter.',
  },
}

function IjtemaRow({
  item,
  onUpdated,
}: {
  item: IjtemaAttendanceKarkunSummary
  onUpdated: () => void
}) {
  const markStatus = (status: IjtemaAttendanceStatus) => {
    const result = updateIjtemaAttendance({ karkunId: item.karkunId, status })
    if (result.success) {
      onUpdated()
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-text-heading">{item.karkunName}</p>
          <StatusPill label={item.status} />
        </div>
        <p className="mt-1 text-sm text-secondary">{item.weekLabel}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {item.status !== 'Present' && (
          <PrimaryButton
            type="button"
            className="px-3 py-2 text-sm"
            onClick={() => markStatus('Present')}
          >
            Mark Present
          </PrimaryButton>
        )}
        {item.status !== 'Informed' && (
          <SecondaryButton
            type="button"
            className="px-3 py-2 text-sm"
            onClick={() => markStatus('Informed')}
          >
            Mark Informed
          </SecondaryButton>
        )}
        {item.status === 'Not recorded' && (
          <SecondaryButton
            type="button"
            className="px-3 py-2 text-sm"
            onClick={() => markStatus('Absent')}
          >
            Mark Absent
          </SecondaryButton>
        )}
        {item.status !== 'Absent' && item.status !== 'Not recorded' && (
          <SecondaryButton
            type="button"
            className="px-3 py-2 text-sm"
            onClick={() => markStatus('Absent')}
          >
            Mark Absent
          </SecondaryButton>
        )}
        <Link to={adminKarkunProfilePath(item.karkunId)}>
          <SecondaryButton type="button" className="px-3 py-2 text-sm">
            Open Profile
          </SecondaryButton>
        </Link>
      </div>
    </li>
  )
}

function JihRegistrationRow({
  item,
  onUpdated,
}: {
  item: JihWebPortalKarkunSummary
  onUpdated: () => void
}) {
  const markRegistered = () => {
    const result = updateJihRegistration({
      karkunId: item.karkunId,
      status: 'Registered',
      registrationDate: item.registration.registrationDate ?? todayDate(),
    })
    if (result.success) {
      onUpdated()
    }
  }

  const markNotRegistered = () => {
    const result = updateJihRegistration({
      karkunId: item.karkunId,
      status: 'Not Registered',
    })
    if (result.success) {
      onUpdated()
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-text-heading">{item.karkunName}</p>
          <StatusPill label={item.registration.status} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {item.registration.status !== 'Registered' && (
          <PrimaryButton type="button" className="px-3 py-2 text-sm" onClick={markRegistered}>
            Mark Registered
          </PrimaryButton>
        )}
        {item.registration.status === 'Registered' && (
          <SecondaryButton type="button" className="px-3 py-2 text-sm" onClick={markNotRegistered}>
            Mark Not Registered
          </SecondaryButton>
        )}
        <Link to={adminKarkunProfilePath(item.karkunId)}>
          <SecondaryButton type="button" className="px-3 py-2 text-sm">
            Open Profile
          </SecondaryButton>
        </Link>
      </div>
    </li>
  )
}

function MonthlyReportingRow({
  item,
  onUpdated,
}: {
  item: JihWebPortalKarkunSummary
  onUpdated: () => void
}) {
  const markSubmitted = () => {
    const result = updateJihMonthlyReport({
      karkunId: item.karkunId,
      status: 'Submitted',
      submissionDate: todayDate(),
    })
    if (result.success) {
      onUpdated()
    }
  }

  const markPending = () => {
    const result = updateJihMonthlyReport({
      karkunId: item.karkunId,
      status: 'Pending',
    })
    if (result.success) {
      onUpdated()
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-text-heading">{item.karkunName}</p>
          <StatusPill label={item.monthlyStatus} />
        </div>
        <p className="mt-1 text-sm text-secondary">{item.currentMonth}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {item.monthlyStatus !== 'Submitted' && (
          <PrimaryButton type="button" className="px-3 py-2 text-sm" onClick={markSubmitted}>
            Mark Submitted
          </PrimaryButton>
        )}
        {item.monthlyStatus === 'Submitted' && (
          <SecondaryButton type="button" className="px-3 py-2 text-sm" onClick={markPending}>
            Mark Pending
          </SecondaryButton>
        )}
        <Link to={adminKarkunProfilePath(item.karkunId)}>
          <SecondaryButton type="button" className="px-3 py-2 text-sm">
            Open Profile
          </SecondaryButton>
        </Link>
      </div>
    </li>
  )
}

function BaitulMaalRow({
  item,
  onUpdated,
}: {
  item: BaitulMaalKarkunSummary
  onUpdated: () => void
}) {
  const markPaid = () => {
    const result = updateBaitulMaal({
      karkunId: item.karkunId,
      status: 'Paid',
      paymentDate: todayDate(),
    })
    if (result.success) {
      onUpdated()
    }
  }

  const markPending = () => {
    const result = updateBaitulMaal({
      karkunId: item.karkunId,
      status: 'Pending',
    })
    if (result.success) {
      onUpdated()
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-text-heading">{item.karkunName}</p>
          <StatusPill label={item.status} />
        </div>
        <p className="mt-1 text-sm text-secondary">{item.monthLabel}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {item.status !== 'Paid' && (
          <PrimaryButton type="button" className="px-3 py-2 text-sm" onClick={markPaid}>
            Mark Paid
          </PrimaryButton>
        )}
        {item.status === 'Paid' && (
          <SecondaryButton type="button" className="px-3 py-2 text-sm" onClick={markPending}>
            Mark Pending
          </SecondaryButton>
        )}
        <Link to={adminKarkunProfilePath(item.karkunId)}>
          <SecondaryButton type="button" className="px-3 py-2 text-sm">
            Open Profile
          </SecondaryButton>
        </Link>
      </div>
    </li>
  )
}

export function ComplianceModulePage() {
  const [dataVersion, setDataVersion] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection = resolveComplianceSection(searchParams.get('section'))
  const statusFilter = normalizeComplianceStatus(searchParams.get('status'))
  const viewAll = searchParams.get('view') === 'all'
  const { effectiveStatus, isPendingView } = resolveComplianceViewFilter(
    activeSection,
    statusFilter,
    viewAll,
  )

  useEffect(() => {
    const unsubJih = subscribeToJihWebPortalStore(() => setDataVersion((value) => value + 1))
    const unsubBaitulMaal = subscribeToBaitulMaalStore(() => setDataVersion((value) => value + 1))
    const unsubIjtema = subscribeToIjtemaAttendanceStore(() => setDataVersion((value) => value + 1))
    return () => {
      unsubJih()
      unsubBaitulMaal()
      unsubIjtema()
    }
  }, [])

  const refresh = () => setDataVersion((value) => value + 1)

  const sectionLabel =
    COMPLIANCE_SECTIONS.find((section) => section.id === activeSection)?.label ?? 'Compliance'

  const setSection = (section: ComplianceSection) => {
    if (statusFilter) {
      setSearchParams({ section, status: statusFilter })
      return
    }
    if (viewAll) {
      setSearchParams({ section, view: 'all' })
      return
    }
    setSearchParams({ section })
  }

  const clearStatusFilter = () => {
    setSearchParams({ section: activeSection, view: 'all' })
  }

  void dataVersion

  let listContent: React.ReactNode
  switch (activeSection) {
    case 'ijtema': {
      const items = filterIjtemaItems(getAllIjtemaAttendanceSummaries(), effectiveStatus)
      if (items.length === 0) {
        listContent = <ExecutionEmptyState {...EMPTY_MESSAGES.ijtema} />
      } else {
        listContent = (
          <ul className="space-y-3">
            {items.map((item) => (
              <IjtemaRow key={item.karkunId} item={item} onUpdated={refresh} />
            ))}
          </ul>
        )
      }
      break
    }
    case 'jih-registration': {
      const items = filterJihRegistrationItems(getAllJihWebPortalSummaries(), effectiveStatus)
      if (items.length === 0) {
        listContent = <ExecutionEmptyState {...EMPTY_MESSAGES['jih-registration']} />
      } else {
        listContent = (
          <ul className="space-y-3">
            {items.map((item) => (
              <JihRegistrationRow key={item.karkunId} item={item} onUpdated={refresh} />
            ))}
          </ul>
        )
      }
      break
    }
    case 'monthly-reporting': {
      const items = filterMonthlyReportingItems(getAllJihWebPortalSummaries(), effectiveStatus)
      if (items.length === 0) {
        listContent = <ExecutionEmptyState {...EMPTY_MESSAGES['monthly-reporting']} />
      } else {
        listContent = (
          <ul className="space-y-3">
            {items.map((item) => (
              <MonthlyReportingRow key={item.karkunId} item={item} onUpdated={refresh} />
            ))}
          </ul>
        )
      }
      break
    }
    case 'baitul-maal': {
      const items = filterBaitulMaalItems(getAllBaitulMaalSummaries(), effectiveStatus)
      if (items.length === 0) {
        listContent = <ExecutionEmptyState {...EMPTY_MESSAGES['baitul-maal']} />
      } else {
        listContent = (
          <ul className="space-y-3">
            {items.map((item) => (
              <BaitulMaalRow key={item.karkunId} item={item} onUpdated={refresh} />
            ))}
          </ul>
        )
      }
      break
    }
    default:
      listContent = null
  }

  void getIjtemaAttendanceDashboardMetrics()
  void getJihWebPortalDashboardMetrics()
  void getBaitulMaalDashboardMetrics()

  const filterLabel = statusFilter || (isPendingView ? getPendingStatusLabel(activeSection) : '')

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Compliance</h1>
        <ActiveCampaignSubtitle />
        <p className="mt-2 text-secondary">What compliance work is pending today.</p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-heading">Compliance Summary</h2>
          <Link to={ROUTES.ADMIN} className="text-sm font-medium text-primary hover:underline">
            Back to Dashboard
          </Link>
        </div>
        <div className="mt-4">
          <ComplianceSummaryCards />
        </div>
      </section>

      <ComplianceSectionNav
        active={activeSection}
        statusFilter={filterLabel}
        onChange={setSection}
      />

      {isPendingView && (
        <p className="text-sm text-secondary">
          Showing pending {getPendingStatusLabel(activeSection).toLowerCase()} items.{' '}
          <button
            type="button"
            onClick={clearStatusFilter}
            className="font-medium text-primary hover:underline"
          >
            View all
          </button>
        </p>
      )}

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-heading">{sectionLabel}</h2>
          {statusFilter && (
            <button
              type="button"
              onClick={clearStatusFilter}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </button>
          )}
        </div>
        <div className="mt-4">{listContent}</div>
      </section>
    </div>
  )
}
