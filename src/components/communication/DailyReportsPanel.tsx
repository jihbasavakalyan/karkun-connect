/**
 * KC-0060 — Daily Reports panel (Administrator → Arkaan).
 * Generate is explicit (never a no-op). Copy/Export unlock after Generate.
 * Send Daily Reports distributes the overall report to the permanent Arkaan group.
 */

import { useCallback, useMemo, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  getArkaanRecipientGroup,
  resolveArkaanRecipients,
} from '@/lib/communication/arkaanRecipientGroup'
import {
  copyDailyReportToClipboard,
  exportDailyReportText,
  generateDailyReportPreview,
  listDailyReportTemplates,
} from '@/services/dailyReportService'
import type { DailyReportPreview, DailyReportTemplateId } from '@/types/dailyReport'
import { useCommunication } from '@/hooks/useCommunication'
import { useRepositoryHydration } from '@/hooks/useRepositoryHydration'

type GenerateStatus = 'idle' | 'ready'
type SendStatus = 'idle' | 'sending' | 'queued' | 'error'

export function DailyReportsPanel() {
  const isHydrated = useRepositoryHydration()
  const { sendBroadcastMessage } = useCommunication()
  const templates = useMemo(() => listDailyReportTemplates(), [])
  const arkaanGroup = useMemo(() => getArkaanRecipientGroup(), [])

  const [templateId, setTemplateId] = useState<DailyReportTemplateId>('daily-progress')
  const [preview, setPreview] = useState<DailyReportPreview | null>(null)
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>('idle')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendQueuedCount, setSendQueuedCount] = useState(0)

  const handleGenerate = useCallback(() => {
    const next = generateDailyReportPreview(templateId)
    setPreview(next)
    setGenerateStatus('ready')
    setCopyStatus('idle')
    setSendStatus('idle')
    setSendError(null)
  }, [templateId])

  const handleSelectTemplate = useCallback((nextId: DailyReportTemplateId) => {
    setTemplateId(nextId)
    setPreview(null)
    setGenerateStatus('idle')
    setCopyStatus('idle')
    setSendStatus('idle')
    setSendError(null)
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

  const handleSendToArkaan = useCallback(async () => {
    if (!preview) return
    const recipients = resolveArkaanRecipients()
    if (recipients.length === 0) {
      setSendStatus('error')
      setSendError('Arkaan group has no active Rukns with mobile numbers.')
      return
    }

    setSendStatus('sending')
    setSendError(null)
    try {
      const result = await sendBroadcastMessage({
        channel: 'whatsapp',
        recipients,
        message: preview.renderedBody,
        templateId: preview.templateId,
      })
      if (result.success === 0) {
        setSendStatus('error')
        setSendError(result.failed[0]?.error ?? 'Unable to queue Daily Report for Arkaan.')
        return
      }
      setSendQueuedCount(result.success)
      setSendStatus('queued')
    } catch (error) {
      setSendStatus('error')
      setSendError(error instanceof Error ? error.message : 'Unable to send Daily Report.')
    }
  }, [preview, sendBroadcastMessage])

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

  const actionsEnabled = Boolean(preview)

  return (
    <div className="space-y-6">
      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-heading">Daily Progress Report</h2>
            <p className="mt-1 text-sm text-secondary">
              Administrator → Arkaan · Generate reads the latest dashboard metrics and refreshes
              the preview.
            </p>
          </div>
          <PrimaryButton type="button" onClick={handleGenerate}>
            Generate
          </PrimaryButton>
        </div>

        {generateStatus === 'ready' && preview ? (
          <p className="mt-3 text-sm text-green-700" role="status">
            Report generated · {new Date(preview.generatedAt).toLocaleString()}
          </p>
        ) : (
          <p className="mt-3 text-sm text-secondary" role="status">
            Select a template, then press Generate to refresh the preview.
          </p>
        )}

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
                  onClick={() => handleSelectTemplate(template.id)}
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
                : 'Press Generate to create a preview'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={handleCopy} disabled={!actionsEnabled}>
              Copy
            </SecondaryButton>
            <SecondaryButton type="button" onClick={handleExport} disabled={!actionsEnabled}>
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
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <h3 className="text-base font-semibold text-text-heading">Send Daily Reports</h3>
        <p className="mt-1 text-sm text-secondary">
          Generate the overall report, then send it to the permanent{' '}
          <strong>{arkaanGroup.name}</strong> group (auto-resolved from Rukn Master).
        </p>

        <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-muted p-4">
          <p className="text-sm font-medium text-text-heading">
            {arkaanGroup.name} · {arkaanGroup.recipients.length} recipients
          </p>
          <p className="mt-1 text-xs text-secondary">
            Permanent group · source: Rukn Master · no daily manual selection
          </p>
          {arkaanGroup.recipients.length > 0 ? (
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-secondary">
              {arkaanGroup.recipients.slice(0, 8).map((recipient) => (
                <li key={recipient.personId}>
                  {recipient.name} · {recipient.mobile}
                </li>
              ))}
              {arkaanGroup.recipients.length > 8 ? (
                <li>…and {arkaanGroup.recipients.length - 8} more</li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-secondary">No active Rukns with mobile numbers.</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PrimaryButton
            type="button"
            onClick={handleSendToArkaan}
            disabled={!actionsEnabled || sendStatus === 'sending' || arkaanGroup.recipients.length === 0}
            loading={sendStatus === 'sending'}
          >
            Send to Arkaan Group
          </PrimaryButton>
          <SecondaryButton type="button" disabled title="Coming in next release">
            Send personalized to every Rukn
          </SecondaryButton>
        </div>
        <p className="mt-2 text-xs text-secondary">Personalized per-Rukn reports — Coming in next release</p>

        {sendStatus === 'queued' ? (
          <p className="mt-3 text-sm text-green-700" role="status">
            Queued overall Daily Report for {sendQueuedCount} Arkaan recipients.
          </p>
        ) : null}
        {sendStatus === 'error' && sendError ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {sendError}
          </p>
        ) : null}
      </section>
    </div>
  )
}
