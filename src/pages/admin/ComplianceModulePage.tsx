import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ComplianceListRow } from '@/components/compliance/ComplianceListRow'
import { ComplianceSummaryCards } from '@/components/compliance/ComplianceSummaryCards'
import { ExecutionEmptyState } from '@/components/execution/ExecutionEmptyState'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import { adminKarkunProfilePath } from '@/constants/routes'
import {
  COMPLIANCE_SECTIONS,
  getComplianceEmptyState,
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

const ACTION_BUTTON_CLASS = 'min-h-10 px-3 py-2 text-sm'

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
            'min-h-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            active === section.id
              ? 'bg-primary-muted text-primary'
              : 'bg-surface text-secondary hover:bg-surface-muted hover:text-text-heading',
          ].join(' ')}
        >
          {section.label}
        </button>
      ))}
      {statusFilter && (
        <span className="self-center rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-secondary">
          {statusFilter}
        </span>
      )}
    </nav>
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

function ProfileLink({ karkunId }: { karkunId: string }) {
  return (
    <Link to={adminKarkunProfilePath(karkunId)} className="shrink-0">
      <SecondaryButton type="button" className={`w-full sm:w-auto ${ACTION_BUTTON_CLASS}`}>
        Open Profile
      </SecondaryButton>
    </Link>
  )
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
    <ComplianceListRow
      karkunId={item.karkunId}
      karkunName={item.karkunName}
      status={item.status}
      meta={item.weekLabel}
      actions={
        <>
          {item.status !== 'Present' && (
            <PrimaryButton
              type="button"
              className={`w-full sm:w-auto ${ACTION_BUTTON_CLASS}`}
              onClick={() => markStatus('Present')}
            >
              Mark Present
            </PrimaryButton>
          )}
          {item.status !== 'Informed' && (
            <SecondaryButton
              type="button"
              className={`w-full sm:w-auto ${ACTION_BUTTON_CLASS}`}
              onClick={() => markStatus('Informed')}
            >
              Mark Informed
            </SecondaryButton>
          )}
          {item.status !== 'Absent' && (
            <SecondaryButton
              type="button"
              className={`w-full sm:w-auto ${ACTION_BUTTON_CLASS}`}
              onClick={() => markStatus('Absent')}
            >
              Mark Absent
            </SecondaryButton>
          )}
          <ProfileLink karkunId={item.karkunId} />
        </>
      }
    />
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
    <ComplianceListRow
      karkunId={item.karkunId}
      karkunName={item.karkunName}
      status={item.registration.status}
      actions={
        <>
          {item.registration.status !== 'Registered' && (
            <PrimaryButton
              type="button"
              className={`w-full sm:w-auto ${ACTION_BUTTON_CLASS}`}
              onClick={markRegistered}
            >
              Mark Registered
            </PrimaryButton>
          )}
          {item.registration.status === 'Registered' && (
            <SecondaryButton
              type="button"
              className={`w-full sm:w-auto ${ACTION_BUTTON_CLASS}`}
              onClick={markNotRegistered}
            >
              Mark Not Registered
            </SecondaryButton>
          )}
          <ProfileLink karkunId={item.karkunId} />
        </>
      }
    />
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
    <ComplianceListRow
      karkunId={item.karkunId}
      karkunName={item.karkunName}
      status={item.monthlyStatus}
      meta={item.currentMonth}
      actions={
        <>
          {item.monthlyStatus !== 'Submitted' && (
            <PrimaryButton
              type="button"
              className={`w-full sm:w-auto ${ACTION_BUTTON_CLASS}`}
              onClick={markSubmitted}
            >
              Mark Submitted
            </PrimaryButton>
          )}
          {item.monthlyStatus === 'Submitted' && (
            <SecondaryButton
              type="button"
              className={`w-full sm:w-auto ${ACTION_BUTTON_CLASS}`}
              onClick={markPending}
            >
              Mark Pending
            </SecondaryButton>
          )}
          <ProfileLink karkunId={item.karkunId} />
        </>
      }
    />
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
    <ComplianceListRow
      karkunId={item.karkunId}
      karkunName={item.karkunName}
      status={item.status}
      meta={item.monthLabel}
      actions={
        <>
          {item.status !== 'Paid' && (
            <PrimaryButton
              type="button"
              className={`w-full sm:w-auto ${ACTION_BUTTON_CLASS}`}
              onClick={markPaid}
            >
              Mark Paid
            </PrimaryButton>
          )}
          {item.status === 'Paid' && (
            <SecondaryButton
              type="button"
              className={`w-full sm:w-auto ${ACTION_BUTTON_CLASS}`}
              onClick={markPending}
            >
              Mark Pending
            </SecondaryButton>
          )}
          <ProfileLink karkunId={item.karkunId} />
        </>
      }
    />
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

  const emptyState = getComplianceEmptyState(activeSection, isPendingView)
  let listContent: React.ReactNode

  switch (activeSection) {
    case 'ijtema': {
      const items = filterIjtemaItems(getAllIjtemaAttendanceSummaries(), effectiveStatus)
      listContent =
        items.length === 0 ? (
          <ExecutionEmptyState {...emptyState} />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <IjtemaRow key={item.karkunId} item={item} onUpdated={refresh} />
            ))}
          </ul>
        )
      break
    }
    case 'jih-registration': {
      const items = filterJihRegistrationItems(getAllJihWebPortalSummaries(), effectiveStatus)
      listContent =
        items.length === 0 ? (
          <ExecutionEmptyState {...emptyState} />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <JihRegistrationRow key={item.karkunId} item={item} onUpdated={refresh} />
            ))}
          </ul>
        )
      break
    }
    case 'monthly-reporting': {
      const items = filterMonthlyReportingItems(getAllJihWebPortalSummaries(), effectiveStatus)
      listContent =
        items.length === 0 ? (
          <ExecutionEmptyState {...emptyState} />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <MonthlyReportingRow key={item.karkunId} item={item} onUpdated={refresh} />
            ))}
          </ul>
        )
      break
    }
    case 'baitul-maal': {
      const items = filterBaitulMaalItems(getAllBaitulMaalSummaries(), effectiveStatus)
      listContent =
        items.length === 0 ? (
          <ExecutionEmptyState {...emptyState} />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <BaitulMaalRow key={item.karkunId} item={item} onUpdated={refresh} />
            ))}
          </ul>
        )
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
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Compliance</h1>
        <ActiveCampaignSubtitle />
        <p className="mt-2 text-secondary">What compliance work needs my attention today.</p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
        <h2 className="text-lg font-semibold text-text-heading">Compliance Summary</h2>
        <div className="mt-4">
          <ComplianceSummaryCards />
        </div>
      </section>

      <ComplianceSectionNav
        active={activeSection}
        statusFilter={filterLabel}
        onChange={setSection}
      />

      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-heading">{sectionLabel}</h2>
            {isPendingView && (
              <p className="mt-1 text-sm text-secondary">
                Showing pending {getPendingStatusLabel(activeSection).toLowerCase()} items.
              </p>
            )}
          </div>
          {(statusFilter || isPendingView) && (
            <button
              type="button"
              onClick={clearStatusFilter}
              className="min-h-10 text-sm font-medium text-primary hover:underline"
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
