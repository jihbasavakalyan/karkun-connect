/**
 * KC-0059 — Daily Reports panel (Administrator → Arkaan).
 * Read-only preview / copy / export. Does not mutate dashboard state.
 */

import { useCallback, useMemo, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  copyDailyReportToClipboard,
  exportDailyReportText,
  generateDailyReportPreview,
  listDailyReportTemplates,
} from '@/services/dailyReportService'
import type { DailyReportTemplateId } from '@/types/dailyReport'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useRepositoryHydration } from '@/hooks/useRepositoryHydration'

export function DailyReportsPanel() {
  const isHydrated = useRepositoryHydration()
  const { assignmentVersion } = useAssignmentEngine()
  const templates = useMemo(() => listDailyReportTemplates(), [])
  const [templateId, setTemplateId] = useState<DailyReportTemplateId>('daily-progress')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [generationTick, setGenerationTick] = useState(0)

  const preview = useMemo(() => {
    void assignmentVersion
    void generationTick
    if (!isHydrated) {
      return null
    }
    return generateDailyReportPreview(templateId)
  }, [assignmentVersion, generationTick, isHydrated, templateId])

  const handleGenerate = useCallback(() => {
    setCopyStatus('idle')
    setGenerationTick((value) => value + 1)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!preview) return
    try {
      await copyDailyReportToClipboard(preview)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }, [preview])

  const handleExport = useCallback(() => {
    if (!preview) return
    exportDailyReportText(preview)
  }, [preview])

  if (!isHydrated) {
    return (
      <p
        className="rounded-lg border border-border bg-surface-muted p-6 text-center text-sm text-secondary"
        aria-busy="true"
      >
        Loading campaign metrics…
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-heading">Daily Progress Report</h2>
            <p className="mt-1 text-sm text-secondary">
              Administrator → Arkaan · Urdu templates filled from live dashboard metrics
              (read-only).
            </p>
          </div>
          <PrimaryButton type="button" onClick={handleGenerate}>
            Generate
          </PrimaryButton>
        </div>

        {preview ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
              <dt className="text-xs text-secondary">Connected</dt>
              <dd className="text-base font-semibold text-text-heading">
                {preview.metrics.connected}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
              <dt className="text-xs text-secondary">Remaining</dt>
              <dd className="text-base font-semibold text-text-heading">
                {preview.metrics.remaining}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
              <dt className="text-xs text-secondary">Progress</dt>
              <dd className="text-base font-semibold text-text-heading">
                {preview.metrics.progress}%
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
              <dt className="text-xs text-secondary">Day</dt>
              <dd className="text-base font-semibold text-text-heading">
                {preview.metrics.dayLabel}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
              <dt className="text-xs text-secondary">Visits today</dt>
              <dd className="text-base font-semibold text-text-heading">
                {preview.metrics.todayVisits}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
              <dt className="text-xs text-secondary">Pending visits</dt>
              <dd className="text-base font-semibold text-text-heading">
                {preview.metrics.pendingVisits}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
              <dt className="text-xs text-secondary">Follow-ups</dt>
              <dd className="text-base font-semibold text-text-heading">
                {preview.metrics.followUps}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
              <dt className="text-xs text-secondary">Development / Compliance</dt>
              <dd className="text-base font-semibold text-text-heading">
                {preview.metrics.development}% / {preview.metrics.compliance}%
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <h3 className="text-base font-semibold text-text-heading">Select Template</h3>
        <ul className="mt-3 grid gap-3 lg:grid-cols-3">
          {templates.map((template) => {
            const selected = template.id === templateId
            return (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateId(template.id)
                    setCopyStatus('idle')
                  }}
                  className={[
                    'h-full w-full rounded-lg border px-3 py-3 text-left transition',
                    selected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-surface-muted hover:border-primary/40',
                  ].join(' ')}
                >
                  <p className="font-medium text-text-heading">{template.name}</p>
                  <p className="mt-1 text-xs text-secondary" dir="auto">
                    {template.description}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-heading">Preview</h3>
            <p className="text-xs text-secondary">
              {preview
                ? `${preview.templateName} · generated ${new Date(preview.generatedAt).toLocaleString()}`
                : 'Generate a report to preview'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={handleCopy} disabled={!preview}>
              Copy
            </SecondaryButton>
            <SecondaryButton type="button" onClick={handleExport} disabled={!preview}>
              Export
            </SecondaryButton>
          </div>
        </div>

        {copyStatus === 'copied' ? (
          <p className="mt-2 text-sm text-green-700" role="status">
            Copied to clipboard — ready to paste into WhatsApp.
          </p>
        ) : null}
        {copyStatus === 'error' ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            Copy failed. Use Export and open the downloaded file instead.
          </p>
        ) : null}

        <pre
          className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-muted p-4 text-sm leading-relaxed text-text-heading"
          dir="rtl"
          lang="ur"
        >
          {preview?.renderedBody ?? '—'}
        </pre>

        <p className="mt-3 text-xs text-secondary">
          WhatsApp Business API delivery is future-ready via{' '}
          <code className="rounded bg-surface-muted px-1">buildFutureWhatsAppPayload()</code> —
          not enabled in this release.
        </p>
      </section>
    </div>
  )
}
