/**
 * Increment 13 — Curated رپورٹس landing (presentation only).
 */

import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import {
  adminReportsComposerPath,
  buildReportsLandingSections,
  type ReportsLandingSection,
} from '@/lib/reporting/reportsLandingCatalog'
import type { ReportTypeDefinition } from '@/lib/reporting/v2'

const ACTION_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-text-heading hover:border-primary/30 hover:bg-surface-muted'

function ReportRow({ report, domain }: { report: ReportTypeDefinition; domain: string }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{domain}</p>
          <h3 className="mt-1 text-base font-semibold text-text-heading">{report.title}</h3>
          <p className="mt-1 text-sm text-secondary">{report.description}</p>
          <p className="mt-2 text-xs text-secondary">
            Opens configuration · Configure &amp; generate PDF / export
          </p>
        </div>
        <Link to={adminReportsComposerPath(report.id)} className={ACTION_CLASS}>
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

  if (section.id === 'more') {
    return (
      <section className="mt-8" aria-labelledby="reports-more-title">
        <details className="rounded-xl border border-border bg-surface p-4">
          <summary
            id="reports-more-title"
            className="cursor-pointer list-none text-base font-semibold text-text-heading marker:content-none [&::-webkit-details-marker]:hidden"
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
          <ul className="mt-4 space-y-3">
            {section.reports.map((report) => (
              <ReportRow key={report.id} report={report} domain={domainLabel} />
            ))}
          </ul>
        </details>
      </section>
    )
  }

  return (
    <section className="mt-8" aria-labelledby={`reports-section-${section.id}`}>
      <h2 id={`reports-section-${section.id}`} className="text-base font-semibold text-text-heading">
        {section.title}
      </h2>
      <p className="mt-1 text-sm text-secondary">{section.description}</p>
      <ul className="mt-4 space-y-3">
        {section.reports.map((report) => (
          <ReportRow key={`${section.id}-${report.id}`} report={report} domain={domainLabel} />
        ))}
      </ul>
    </section>
  )
}

export function ReportsLandingPanel() {
  const sections = buildReportsLandingSections()

  if (sections.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-4 text-sm text-secondary" role="status">
        No reports available in the catalog.
      </p>
    )
  }

  return (
    <div>
      <section
        className="rounded-xl border border-border bg-surface p-4"
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
          <Link to={adminReportsComposerPath()} className={ACTION_CLASS}>
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
