import type { ReportDocument } from '@/lib/reporting/v2'

type ReportDashboardViewProps = {
  document: ReportDocument | null
  onClose?: () => void
}

/**
 * KC-037C-F — Dashboard renderer for Composer ReportDocument (same models as PDF/exports).
 */
export function ReportDashboardView({ document, onClose }: ReportDashboardViewProps) {
  if (!document) return null

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-primary">
          Dashboard · {document.config.reportType}
        </h2>
        {onClose ? (
          <button type="button" className="text-sm text-secondary hover:text-primary" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
      <p className="mb-4 text-xs text-secondary">
        Same Composer presentation models as PDF/Excel/CSV/JSON. Connection ≠ Visit.
      </p>
      <div className="space-y-4">
        {document.sections.map((section) => {
          const title = section.definition.title ?? section.definition.displayName
          const data = section.model.data as Record<string, unknown>
          const cards = Array.isArray((data as { cards?: unknown }).cards)
            ? ((data as { cards: Array<{ id: string; title: string; value: string | number; subtitle?: string }> }).cards)
            : null
          const narrative = (data as { narrative?: { whereAreWe?: string; action?: string } }).narrative
          const insights = Array.isArray((data as { items?: unknown }).items)
            ? ((data as { items: Array<{ title: string; detail: string; severity: string }> }).items)
            : null

          // KC-038C — Weekly Ijtema Executive dossier preview cards
          const wiExec = (data as {
            executiveSummary?: {
              totalConnectedKarkuns: number
              reminded: number
              present: number
              absent: number
              reportsSubmitted: number
              reportsPending: number
              attendancePct: number
            }
            executiveObservation?: string
          }).executiveSummary
          const wiObservation = (data as { executiveObservation?: string }).executiveObservation
          const wiFollowUp = Array.isArray((data as { followUp?: unknown[] }).followUp)
            ? (data as { followUp: Array<{ ruknName: string }> }).followUp
            : null

          return (
            <article key={section.definition.id} className="rounded-md border border-border/80 p-3">
              <h3 className="text-sm font-semibold text-primary">{title}</h3>
              <p className="text-xs text-secondary">{section.definition.description}</p>
              {wiExec ? (
                <div className="mt-3 space-y-3">
                  {wiObservation ? (
                    <p className="text-sm text-primary">{wiObservation}</p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { title: 'Connected', value: wiExec.totalConnectedKarkuns },
                      { title: 'Reminded', value: wiExec.reminded },
                      { title: 'Present', value: wiExec.present },
                      { title: 'Absent', value: wiExec.absent },
                      { title: 'Reports Submitted', value: wiExec.reportsSubmitted },
                      { title: 'Reports Pending', value: wiExec.reportsPending },
                      { title: 'Attendance %', value: `${wiExec.attendancePct}%` },
                    ].map((c) => (
                      <div key={c.title} className="rounded-md bg-muted/30 px-3 py-2">
                        <p className="text-xs text-secondary">{c.title}</p>
                        <p className="text-lg font-semibold text-primary">{c.value}</p>
                      </div>
                    ))}
                  </div>
                  {wiFollowUp && wiFollowUp.length > 0 ? (
                    <p className="text-sm text-secondary">
                      Follow-up groups: {wiFollowUp.length} Rukn
                      {wiFollowUp.length === 1 ? '' : 's'}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {cards ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map((c) => (
                    <div key={c.id} className="rounded-md bg-muted/30 px-3 py-2">
                      <p className="text-xs text-secondary">{c.title}</p>
                      <p className="text-lg font-semibold text-primary">{c.value}</p>
                      {c.subtitle ? <p className="text-xs text-secondary">{c.subtitle}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {narrative ? (
                <div className="mt-3 space-y-1 text-sm text-primary">
                  {narrative.whereAreWe ? <p>{narrative.whereAreWe}</p> : null}
                  {narrative.action ? <p className="text-secondary">{narrative.action}</p> : null}
                </div>
              ) : null}
              {insights ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {insights.slice(0, 8).map((i, idx) => (
                    <li key={`${i.title}-${idx}`}>
                      <span className="font-medium text-primary">{i.title}</span>
                      <span className="text-secondary"> — {i.detail}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!wiExec && !cards && !narrative && !insights ? (
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted/20 p-2 text-[11px] leading-snug text-secondary">
                  {JSON.stringify(data, null, 2)}
                </pre>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
