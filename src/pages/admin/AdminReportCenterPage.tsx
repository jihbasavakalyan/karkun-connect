import { Link, useSearchParams } from 'react-router-dom'
import { CardSkeleton, PageHeader, PageShell } from '@/components/ui'
import { ReportCenterPanel } from '@/components/reporting/ReportCenterPanel'
import { ReportsLandingPanel } from '@/components/reporting/ReportsLandingPanel'
import { ROUTES } from '@/constants/routes'
import { useRepositoryHydrationStatus } from '@/hooks/useRepositoryHydration'
import { isKnownReportTypeId } from '@/lib/reporting/reportsLandingCatalog'

/**
 * KC-037B / Increment 13 — Admin Reports (رپورٹس).
 * Curated landing first; existing Report Composer remains the generation workspace.
 * KC-037 V1: Administrator-only.
 * @see docs/architecture/kc-037-v1-admin-only-reporting-policy.md
 */
export function AdminReportCenterPage() {
  const [searchParams] = useSearchParams()
  const hydration = useRepositoryHydrationStatus()
  const typeParam = searchParams.get('type')
  const composeRequested = searchParams.get('compose') === '1'
  const selectedType = isKnownReportTypeId(typeParam) ? typeParam : undefined
  const showComposer = composeRequested || Boolean(selectedType)

  if (!showComposer) {
    return (
      <PageShell variant="narrow" className="app-screen">
        <PageHeader
          title="رپورٹس"
          description="A calm report library. Choose a report, then configure and generate in the existing Composer. Reports are read-only views over live operational data — they do not download a PDF by themselves."
        />
        <ReportsLandingPanel />
      </PageShell>
    )
  }

  if (!hydration.ready && !hydration.failed) {
    return (
      <PageShell variant="wide" className="app-screen">
        <PageHeader
          title="رپورٹس"
          description="Loading operational data for the Report Composer…"
          actions={
            <Link
              to={ROUTES.ADMIN_REPORTS}
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-text-heading hover:border-primary/30 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              ← Report library
            </Link>
          }
        />
        <p className="mb-4 text-sm text-secondary" role="status" aria-live="polite">
          Operational repositories are still hydrating. Report figures are not ready yet.
        </p>
        <CardSkeleton count={3} />
      </PageShell>
    )
  }

  return (
    <PageShell variant="wide" className="app-screen">
      <PageHeader
        title="رپورٹس"
        description="Configure and generate using the existing Report Composer. Connection is never conflated with Visit."
        actions={
          <Link
            to={ROUTES.ADMIN_REPORTS}
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-text-heading hover:border-primary/30 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            ← Report library
          </Link>
        }
      />
      {hydration.failed ? (
        <p
          className="mb-4 rounded-lg border border-border bg-surface p-3 text-sm text-amber-800"
          role="alert"
        >
          Some operational data could not finish loading. Generated figures may be incomplete.
          Retry by refreshing the page.
        </p>
      ) : null}
      <p className="mb-4 text-sm text-secondary">
        Composer workspace — presets, sections, and exports are unchanged. Generation starts only
        when you choose Generate / Export.
      </p>
      <ReportCenterPanel initialReportType={selectedType} key={selectedType ?? 'compose'} />
    </PageShell>
  )
}
