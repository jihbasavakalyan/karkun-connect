/**
 * Increment 13 — Curated رپورٹس landing (presentation only).
 * Calm report library → existing Report Composer. Does not download PDFs by itself.
 */

import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { ROUTES } from '@/constants/routes'
import {
  adminReportsComposerPath,
  buildReportsLandingSections,
  getReportPresentationKind,
  hasPurposeBuiltPdf,
  reportPresentationKindLabel,
  type ReportsLandingSection,
} from '@/lib/reporting/reportsLandingCatalog'
import type { ReportTypeDefinition } from '@/lib/reporting/v2'

const ACTION_CLASS =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-text-heading hover:border-primary/40 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const ACTION_PRIMARY_CLASS =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/5 px-3 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function ReportRow({
  report,
  domain,
  emphasis,
}: {
  report: ReportTypeDefinition
  domain: string
  emphasis: 'primary' | 'secondary' | 'quiet'
}) {
  const kind = getReportPresentationKind(report)
  const kindLabel = reportPresentationKindLabel(kind)
  const purposeBuilt = hasPurposeBuiltPdf(report.id)
  const rowClass =
    emphasis === 'primary'
      ? 'rounded-lg border border-primary/20 bg-surface p-4'
      : emphasis === 'quiet'
        ? 'rounded-lg border border-border/70 bg-surface/80 p-3'
        : 'rounded-lg border border-border bg-surface p-4'

  return (
    <li className={rowClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium text-secondary">{domain}</p>
            <span className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-secondary">
              {kindLabel}
            </span>
            {purposeBuilt ? (
              <span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                Purpose-built export
              </span>
            ) : (
              <span className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-secondary">
                Composer export
              </span>
            )}
          </div>
          <h3 className="mt-1 text-base font-semibold text-text-heading">{report.title}</h3>
          <p className="mt-1 text-sm text-secondary">{report.description}</p>
          <p className="mt-2 text-xs text-secondary">
            Opens Report Composer · Configure &amp; Generate — does not download a PDF by itself.
          </p>
        </div>
        <Link
          to={adminReportsComposerPath(report.id)}
          className={emphasis === 'primary' ? ACTION_PRIMARY_CLASS : ACTION_CLASS}
        >
          Configure &amp; Generate
        </Link>
      </div>
    </li>
  )
}

function LandingSection({ section }: { section: ReportsLandingSection }) {
  const domainLabel =
    section.id === 'featured'
      ? 'Featured'
      : section.id === 'more'
        ? 'More'
        : section.title.split(' / ')[0] ?? section.title

  const emphasis =
    section.id === 'featured' ? 'primary' : section.id === 'more' ? 'quiet' : 'secondary'

  if (section.id === 'more') {
    return (
      <section className="mt-8" aria-labelledby="reports-more-title">
        <details className="rounded-lg border border-border bg-surface p-4">
          <summary
            id="reports-more-title"
            className="cursor-pointer list-none text-base font-semibold text-text-heading marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
          >
            <span className="inline-flex min-h-11 w-full items-center justify-between gap-3">
              <span>
                {section.title}
                <span className="mt-1 block text-sm font-normal text-secondary">
                  {section.description}
                </span>
              </span>
              <span className="text-sm font-medium text-primary">Show</span>
            </span>
          </summary>
          <ul className="mt-4 space-y-2">
            {section.reports.map((report) => (
              <ReportRow key={report.id} report={report} domain={domainLabel} emphasis="quiet" />
            ))}
          </ul>
        </details>
      </section>
    )
  }

  return (
    <section className="mt-8" aria-labelledby={`reports-section-${section.id}`}>
      <h2
        id={`reports-section-${section.id}`}
        className="text-base font-semibold text-text-heading"
      >
        {section.title}
      </h2>
      <p className="mt-1 text-sm text-secondary">{section.description}</p>
      <ul className="mt-4 space-y-3">
        {section.reports.map((report) => (
          <ReportRow
            key={`${section.id}-${report.id}`}
            report={report}
            domain={domainLabel}
            emphasis={emphasis}
          />
        ))}
      </ul>
    </section>
  )
}

export function ReportsLandingPanel() {
  const sections = buildReportsLandingSections()

  if (sections.length === 0) {
    return (
      <EmptyState
        icon="file-text"
        title="No reports available"
        description="No reports available in the catalog."
      />
    )
  }

  return (
    <div>
      <section
        className="rounded-lg border border-border bg-surface p-4"
        aria-labelledby="reports-composer-entry-title"
      >
        <h2 id="reports-composer-entry-title" className="text-sm font-semibold text-text-heading">
          Report Composer
        </h2>
        <p className="mt-1 text-sm text-secondary">
          Full configuration, presets, sections, and export formats (PDF, dashboard, Excel, CSV,
          JSON) use the existing Composer. Selecting a report below opens that same Composer with
          the type preselected — it does not download a PDF by itself.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to={adminReportsComposerPath()} className={ACTION_PRIMARY_CLASS}>
            Open Report Composer
          </Link>
          <Link to={ROUTES.ADMIN_CAMPAIGN} className={ACTION_CLASS}>
            مہمات
          </Link>
        </div>
      </section>

      {sections.map((section) => (
        <LandingSection key={section.id} section={section} />
      ))}
    </div>
  )
}
