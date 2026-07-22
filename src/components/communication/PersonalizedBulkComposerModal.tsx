import { useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { CommunicationStatusBadge } from '@/components/communication/CommunicationStatusBadge'
import {
  EditableCommunicationComposerFields,
  type ComposerMode,
  refreshComposerTemplates,
} from '@/components/communication/EditableCommunicationComposerFields'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { combineSubjectAndBody } from '@/lib/communication/combineSubjectAndBody'
import { buildMailMergeVariablesForRecipient } from '@/lib/communication/mailMergeEngine'
import { prepareWhatsAppLaunchWindows } from '@/lib/communication/whatsappWebLaunch'
import {
  previewPersonalizedMessages,
  runPersonalizedBulkSend,
  type PersonalizedBulkReport,
} from '@/lib/communication/personalizedBulkSend'
import {
  applyTemplateVariables,
  listTemplates,
  resolveFooterMode,
} from '@/services/templateService'
import type { MessageRecipient } from '@/types/communication'

type PersonalizedBulkComposerModalProps = {
  isOpen: boolean
  recipients: MessageRecipient[]
  onClose: () => void
  /** Called after the batch finishes (or is cancelled mid-way). */
  onComplete?: (report: PersonalizedBulkReport) => void
  title?: string
  initialTemplateId?: string
  initialMessage?: string
  role?: 'administrator' | 'rukn'
}

type Phase = 'compose' | 'preview' | 'sending' | 'report'

/**
 * KC-0077.1 — Personalized bulk communication (mail merge).
 * KC-0077.2.1 — Editable subject/body; templates are starting points only.
 */
export function PersonalizedBulkComposerModal({
  isOpen,
  recipients,
  onClose,
  onComplete,
  title = 'Personalized Send All',
  initialTemplateId,
  initialMessage,
  role = 'administrator',
}: PersonalizedBulkComposerModalProps) {
  if (!isOpen) return null

  return (
    <PersonalizedBulkComposerContent
      key={`${recipients.map((r) => r.personId).join(',')}-${initialTemplateId ?? ''}`}
      recipients={recipients}
      onClose={onClose}
      onComplete={onComplete}
      title={title}
      initialTemplateId={initialTemplateId}
      initialMessage={initialMessage}
      role={role}
    />
  )
}

function PersonalizedBulkComposerContent({
  recipients,
  onClose,
  onComplete,
  title,
  initialTemplateId,
  initialMessage,
  role = 'administrator',
}: Omit<PersonalizedBulkComposerModalProps, 'isOpen'>) {
  const [templates, setTemplates] = useState(() => listTemplates())
  const startingId = initialTemplateId ?? ''
  const startingTemplate = templates.find((item) => item.id === startingId)

  const [phase, setPhase] = useState<Phase>('compose')
  const [mode, setMode] = useState<ComposerMode>(startingId ? 'official' : 'custom')
  const [templateId, setTemplateId] = useState(startingId)
  const [subject, setSubject] = useState(startingTemplate?.subject ?? '')
  const [message, setMessage] = useState(
    initialMessage?.trim() ? initialMessage : (startingTemplate?.body ?? ''),
  )
  const [previewIndex, setPreviewIndex] = useState(0)
  const [progress, setProgress] = useState({ index: 0, total: recipients.length, name: '' })
  const [report, setReport] = useState<PersonalizedBulkReport | null>(null)
  const [error, setError] = useState('')
  const cancelRef = useRef({ cancelled: false })

  /** Subject + body merged as one template string for the existing mail-merge send path. */
  const templateForMerge = useMemo(
    () => combineSubjectAndBody(subject, message),
    [subject, message],
  )

  /** Body-only previews for UI; send still uses templateForMerge (subject + body). */
  const previews = useMemo(
    () => previewPersonalizedMessages(message, recipients, role),
    [message, recipients, role],
  )

  const currentPreview = previews[previewIndex] ?? previews[0]
  const selectedTemplate = templates.find((item) => item.id === templateId)
  const isOfficialLocked = role === 'rukn' && Boolean(selectedTemplate?.isOfficial)

  const previewSubjectResolved = useMemo(() => {
    if (!subject.trim() || !currentPreview) return ''
    const vars = buildMailMergeVariablesForRecipient(currentPreview.recipient)
    return applyTemplateVariables(subject, vars).trim()
  }, [subject, currentPreview])

  const audience =
    recipients.every((r) => r.personKind === 'rukn')
      ? 'rukn'
      : recipients.every((r) => r.personKind === 'karkun')
        ? 'karkun'
        : 'all'

  const handleTemplateChange = (id: string) => {
    setTemplateId(id)
    setMode(id ? 'official' : 'custom')
    const template = templates.find((item) => item.id === id)
    setSubject(template?.subject ?? '')
    setMessage(template?.body ?? '')
  }

  const handleStartSend = () => {
    if (!message.trim() && !subject.trim()) {
      setError('Subject or message is required.')
      return
    }
    if (recipients.length === 0) {
      setError('Select at least one recipient.')
      return
    }
    setError('')
    setPhase('sending')
    cancelRef.current.cancelled = false
    // Pre-open tabs during the click handler so async merge can navigate them (popup-safe).
    const launchWindows = prepareWhatsAppLaunchWindows(recipients.length)
    void (async () => {
      const result = await runPersonalizedBulkSend({
        recipients,
        templateBody: templateForMerge,
        templateId: templateId || undefined,
        role,
        signal: cancelRef.current,
        launchWindows,
        onProgress: (p) =>
          setProgress({
            index: p.index,
            total: p.total,
            name: p.currentRecipientName,
          }),
      })
      setReport(result)
      setPhase('report')
      onComplete?.(result)
    })()
  }

  const handleCancelBatch = () => {
    cancelRef.current.cancelled = true
  }

  const progressPct =
    progress.total > 0 ? Math.min(100, Math.round((progress.index / progress.total) * 100)) : 0

  const canProceed = Boolean(templateForMerge.trim()) && recipients.length > 0

  return (
    <Modal
      isOpen
      title={title ?? 'Personalized Send All'}
      onClose={phase === 'sending' ? () => undefined : onClose}
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          {recipients.length} recipient{recipients.length === 1 ? '' : 's'} · each receives a
          personalized message · footer:{' '}
          {resolveFooterMode(role) === 'official' ? 'Administrator' : 'Personal'}
        </p>

        {phase === 'compose' ? (
          <>
            <EditableCommunicationComposerFields
              mode={mode}
              onModeChange={setMode}
              templateId={templateId}
              templates={templates}
              onTemplateChange={handleTemplateChange}
              subject={subject}
              onSubjectChange={setSubject}
              message={message}
              onMessageChange={setMessage}
              isBodyLocked={isOfficialLocked}
              audience={audience}
              roleHint={role}
              onCustomTemplateSaved={(saved) => {
                setTemplates(refreshComposerTemplates())
                setTemplateId(saved.id)
                setMode('official')
                setSubject(saved.subject ?? '')
                setMessage(saved.body)
              }}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <SecondaryButton type="button" onClick={onClose}>
                Cancel
              </SecondaryButton>
              <SecondaryButton
                type="button"
                onClick={() => {
                  setPreviewIndex(0)
                  setPhase('preview')
                }}
                disabled={!canProceed}
              >
                Preview
              </SecondaryButton>
              <PrimaryButton type="button" onClick={handleStartSend} disabled={!canProceed}>
                Send All
              </PrimaryButton>
            </div>
          </>
        ) : null}

        {phase === 'preview' && currentPreview ? (
          <>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
              <p className="font-medium text-text-heading">
                Recipient {previewIndex + 1} of {previews.length}: {currentPreview.recipient.name}
              </p>
              <p className="text-xs text-secondary">{currentPreview.recipient.mobile}</p>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                Preview (as recipient will receive)
              </p>
              {previewSubjectResolved ? (
                <div className="mt-2 border-b border-border pb-2">
                  <p className="text-xs text-secondary">Subject</p>
                  <p className="text-sm font-medium text-text-heading" dir="auto">
                    {previewSubjectResolved}
                  </p>
                </div>
              ) : null}
              <p className="mt-2 text-xs text-secondary">Message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text-heading" dir="auto">
                {currentPreview.message}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <SecondaryButton
                  type="button"
                  className="px-3 py-1.5 text-sm"
                  disabled={previewIndex <= 0}
                  onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                >
                  Previous
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  className="px-3 py-1.5 text-sm"
                  disabled={previewIndex >= previews.length - 1}
                  onClick={() => setPreviewIndex((i) => Math.min(previews.length - 1, i + 1))}
                >
                  Next
                </SecondaryButton>
              </div>
              <div className="flex gap-2">
                <SecondaryButton type="button" onClick={() => setPhase('compose')}>
                  Back
                </SecondaryButton>
                <PrimaryButton type="button" onClick={handleStartSend}>
                  Send All
                </PrimaryButton>
              </div>
            </div>
          </>
        ) : null}

        {phase === 'sending' ? (
          <div className="space-y-3" aria-live="polite">
            <p className="text-sm font-medium text-text-heading">Processing…</p>
            <p className="text-sm text-secondary">
              Recipient {progress.index} of {progress.total}
              {progress.name ? ` · ${progress.name}` : ''}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <SecondaryButton type="button" onClick={handleCancelBatch}>
              Cancel after current
            </SecondaryButton>
            <p className="text-xs text-secondary">
              Cancellation waits until the current message finishes sending.
            </p>
          </div>
        ) : null}

        {phase === 'report' && report ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                <dt className="text-xs text-secondary">Total selected</dt>
                <dd className="text-lg font-semibold text-text-heading">{report.totalSelected}</dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                <dt className="text-xs text-secondary">Successfully sent</dt>
                <dd className="text-lg font-semibold text-text-heading">
                  {report.successfullySent}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                <dt className="text-xs text-secondary">Failed</dt>
                <dd className="text-lg font-semibold text-text-heading">{report.failed}</dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                <dt className="text-xs text-secondary">Skipped</dt>
                <dd className="text-lg font-semibold text-text-heading">{report.skipped}</dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                <dt className="text-xs text-secondary">Processing time</dt>
                <dd className="text-lg font-semibold text-text-heading">
                  {(report.processingTimeMs / 1000).toFixed(1)}s
                </dd>
              </div>
            </dl>
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {report.items.map((item) => (
                <li
                  key={item.personId}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-text-heading">{item.personName}</p>
                    {item.reason ? <p className="text-xs text-secondary">{item.reason}</p> : null}
                  </div>
                  <CommunicationStatusBadge
                    status={
                      item.outcome === 'sent'
                        ? 'queued'
                        : item.outcome === 'failed'
                          ? 'failed'
                          : 'pending'
                    }
                  />
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <PrimaryButton type="button" onClick={onClose}>
                Done
              </PrimaryButton>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
