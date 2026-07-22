import { useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Icon } from '@/components/ui/Icon'
import { SchedulePickerModal } from '@/components/communication/SchedulePickerModal'
import { PersonalizedBulkComposerModal } from '@/components/communication/PersonalizedBulkComposerModal'
import {
  composeWhatsAppMessage,
  listTemplates,
  resolveFooterMode,
} from '@/services/templateService'
import { scheduleWhatsAppMessage } from '@/services/schedulingService'
import { buildWhatsAppLink } from '@/utils/personContactLinks'
import type { MessageRecipient, MessageTemplate } from '@/types/communication'
import { TEMPLATE_CATEGORY_LABELS, TEMPLATE_PLACEHOLDER_KEYS } from '@/types/communication'
import type { PersonalizedBulkReport } from '@/lib/communication/personalizedBulkSend'

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

type MessageComposerModalProps = {
  isOpen: boolean
  recipients: MessageRecipient[]
  onClose: () => void
  onSend: (input: { templateId?: string; message: string }) => Promise<{ success: boolean; error?: string }>
  title?: string
  initialTemplateId?: string
  /** Optional draft body (used when no template body, or as override when provided). */
  initialMessage?: string
  contextVariables?: Record<string, string>
  /** Controls footer and whether official wording is editable. Default administrator. */
  role?: 'administrator' | 'rukn'
  /** Digital Rafeeq recommended template id (highlighted). */
  recommendedTemplateId?: string
  /** KC-0077.1 — after personalized bulk completes (multi-recipient). */
  onBulkComplete?: (report: PersonalizedBulkReport) => void
}

export function MessageComposerModal({
  isOpen,
  recipients,
  onClose,
  onSend,
  title = 'Compose WhatsApp Message',
  initialTemplateId,
  initialMessage,
  contextVariables,
  role = 'administrator',
  recommendedTemplateId,
  onBulkComplete,
}: MessageComposerModalProps) {
  if (!isOpen) {
    return null
  }

  // KC-0077.1 — multi-recipient = personalized mail-merge Send All (not identical broadcast).
  if (recipients.length > 1) {
    return (
      <PersonalizedBulkComposerModal
        isOpen={isOpen}
        recipients={recipients}
        onClose={onClose}
        title={title}
        initialTemplateId={initialTemplateId}
        initialMessage={initialMessage}
        role={role}
        onComplete={(report) => {
          onBulkComplete?.(report)
        }}
      />
    )
  }

  return (
    <MessageComposerModalContent
      key={`${title}-${recipients.map((r) => r.personId).join(',')}-${initialTemplateId ?? ''}-${initialMessage?.slice(0, 24) ?? ''}`}
      recipients={recipients}
      onClose={onClose}
      onSend={onSend}
      title={title}
      initialTemplateId={initialTemplateId}
      initialMessage={initialMessage}
      contextVariables={contextVariables}
      role={role}
      recommendedTemplateId={recommendedTemplateId}
    />
  )
}

function MessageComposerModalContent({
  recipients,
  onClose,
  onSend,
  title = 'Compose WhatsApp Message',
  initialTemplateId,
  initialMessage,
  contextVariables,
  role = 'administrator',
  recommendedTemplateId,
}: Omit<MessageComposerModalProps, 'isOpen'>) {
  const templates = listTemplates()
  const footerMode = resolveFooterMode(role)
  const startingId = initialTemplateId ?? recommendedTemplateId ?? ''
  const startingTemplate = templates.find((item) => item.id === startingId)

  const [templateId, setTemplateId] = useState(startingId)
  const [message, setMessage] = useState(
    initialMessage?.trim() ? initialMessage : (startingTemplate?.body ?? ''),
  )
  const [placeholders, setPlaceholders] = useState<Record<string, string>>(() => ({
    name: recipients[0]?.name ?? '',
    date: '',
    time: '',
    venue: '',
    event: '',
    month: '',
    campaign: '',
    ...contextVariables,
  }))
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sending, setSending] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const selectedTemplate: MessageTemplate | undefined = templates.find(
    (item) => item.id === templateId,
  )
  const isOfficialLocked = role === 'rukn' && Boolean(selectedTemplate?.isOfficial)
  const variableKeys = selectedTemplate?.variables.length
    ? selectedTemplate.variables
    : TEMPLATE_PLACEHOLDER_KEYS.filter((key) => message.includes(`{${key}}`))

  const mergedVariables = useMemo(
    () => ({
      ...placeholders,
      name: placeholders.name || recipients[0]?.name || '',
      ...contextVariables,
    }),
    [placeholders, recipients, contextVariables],
  )

  const composedMessage = useMemo(
    () => composeWhatsAppMessage(message, mergedVariables, footerMode),
    [message, mergedVariables, footerMode],
  )

  const primaryRecipient = recipients[0]
  const singleRecipient = recipients.length === 1 && primaryRecipient
  const waLink = singleRecipient
    ? buildWhatsAppLink(
        primaryRecipient.whatsapp?.trim() ? primaryRecipient.whatsapp : primaryRecipient.mobile,
        composedMessage,
      )
    : null

  const handleTemplateChange = (id: string) => {
    setTemplateId(id)
    const template = templates.find((item) => item.id === id)
    if (template) {
      setMessage(template.body)
    } else {
      setMessage('')
    }
  }

  const handleSend = async () => {
    setError('')
    setSuccess('')
    setSending(true)
    const result = await onSend({
      templateId: templateId || undefined,
      message: composedMessage,
    })
    setSending(false)
    if (!result.success) {
      setError(result.error ?? 'Unable to queue message.')
      return
    }
    setSuccess('Message queued for delivery. Backend integration arrives in Sprint 16.')
    setTimeout(() => onClose(), 1200)
  }

  const handleSendViaWhatsApp = () => {
    if (!waLink) return
    window.open(waLink, '_blank', 'noopener,noreferrer')
  }

  const handleSchedule = (scheduledForIso: string) => {
    scheduleWhatsAppMessage({
      recipients,
      templateId: templateId || undefined,
      message: composedMessage,
      scheduledFor: scheduledForIso,
    })
    setScheduleOpen(false)
    setSuccess('Message scheduled. It will appear under Communication → Scheduled.')
    setTimeout(() => onClose(), 1400)
  }

  return (
    <Modal isOpen title={title} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-text-heading">Recipient</p>
          {recipients.length === 1 && primaryRecipient ? (
            <p className="mt-1 text-sm text-secondary">
              {primaryRecipient.name} · {primaryRecipient.mobile}
            </p>
          ) : (
            <p className="mt-1 text-sm text-secondary">{recipients.length} recipients selected</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="composer-template" className="text-sm font-medium text-text-heading">
            Template
          </label>
          <select
            id="composer-template"
            value={templateId}
            onChange={(event) => handleTemplateChange(event.target.value)}
            className={selectClassName}
          >
            <option value="">Custom message</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.id === recommendedTemplateId ? '★ ' : ''}
                {template.name} ({TEMPLATE_CATEGORY_LABELS[template.category]})
                {template.isOfficial ? ' · Official' : ''}
              </option>
            ))}
          </select>
          {recommendedTemplateId && templateId === recommendedTemplateId ? (
            <p className="text-xs text-primary">Digital Rafeeq recommendation selected.</p>
          ) : null}
          {role === 'rukn' ? (
            <p className="text-xs text-secondary">
              Official wording is locked. Fill placeholders, preview, then send.
            </p>
          ) : null}
        </div>

        {variableKeys.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {variableKeys.map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-heading">{`{${key}}`}</label>
                <input
                  value={placeholders[key] ?? ''}
                  onChange={(event) =>
                    setPlaceholders((current) => ({ ...current, [key]: event.target.value }))
                  }
                  className={selectClassName}
                  placeholder={key}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="composer-message" className="text-sm font-medium text-text-heading">
            Message {isOfficialLocked ? '(read-only official wording)' : ''}
          </label>
          <textarea
            id="composer-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            dir="auto"
            readOnly={isOfficialLocked}
            className={`${selectClassName} ${isOfficialLocked ? 'bg-surface-muted' : ''}`}
            placeholder="Type your message..."
          />
          <p className="text-xs text-secondary">
            {composedMessage.length} characters including footer (
            {footerMode === 'official' ? 'Administrator' : 'Personal'})
          </p>
        </div>

        {composedMessage && (
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">Preview</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-text-heading" dir="auto">
              {composedMessage}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        <div className="flex flex-col gap-3 pt-2">
          {singleRecipient && (
            <PrimaryButton
              type="button"
              fullWidth
              onClick={handleSendViaWhatsApp}
              disabled={!waLink}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icon name="message" size="sm" />
                Send via WhatsApp
              </span>
            </PrimaryButton>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <SecondaryButton type="button" onClick={onClose} disabled={sending}>
              Cancel
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => setScheduleOpen(true)}
              disabled={sending || !composedMessage.trim()}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" size="sm" />
                Schedule
              </span>
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={handleSend}
              disabled={sending || !composedMessage.trim()}
            >
              {sending ? 'Sending…' : 'Queue Message'}
            </PrimaryButton>
          </div>
        </div>
      </div>

      <SchedulePickerModal
        isOpen={scheduleOpen}
        title="Schedule Message"
        description="Choose when this message should be sent. Automated delivery arrives in a future sprint."
        confirmLabel="Schedule Message"
        onClose={() => setScheduleOpen(false)}
        onConfirm={handleSchedule}
      />
    </Modal>
  )
}
