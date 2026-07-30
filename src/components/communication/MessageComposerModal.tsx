import { useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Icon } from '@/components/ui/Icon'
import { SchedulePickerModal } from '@/components/communication/SchedulePickerModal'
import { PersonalizedBulkComposerModal } from '@/components/communication/PersonalizedBulkComposerModal'
import {
  EditableCommunicationComposerFields,
  type ComposerMode,
  refreshComposerTemplates,
} from '@/components/communication/EditableCommunicationComposerFields'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import { combineSubjectAndBody } from '@/lib/communication/combineSubjectAndBody'
import { buildOfficialCommunicationVariables } from '@/lib/communication/officialCommunicationEngine'
import {
  applyTemplateVariables,
  composeWhatsAppMessage,
  listTemplates,
  resolveFooterMode,
} from '@/services/templateService'
import { scheduleWhatsAppMessage } from '@/services/schedulingService'
import { buildWhatsAppLink } from '@/utils/personContactLinks'
import type { MessageRecipient, MessageTemplate } from '@/types/communication'
import { TEMPLATE_PLACEHOLDER_KEYS } from '@/types/communication'
import type { PersonalizedBulkReport } from '@/lib/communication/personalizedBulkSend'

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/** Free-text slots the operator may edit; everything else is live-resolved. */
const FREE_TEXT_VARIABLE_KEYS = new Set([
  'PersonalNote',
  'AdditionalRemarks',
  'ClosingMessage',
  'time',
  'venue',
  'event',
])

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

function scrubZeroWidth(text: string): string {
  return text
    .replace(/\u200b/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
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
  const footerMode = resolveFooterMode(role)
  const startingId = initialTemplateId ?? recommendedTemplateId ?? ''
  const [templates, setTemplates] = useState(() => listTemplates())
  const startingTemplate = templates.find((item) => item.id === startingId)

  const [mode, setMode] = useState<ComposerMode>(startingId ? 'official' : 'custom')
  const [templateId, setTemplateId] = useState(startingId)
  const [subject, setSubject] = useState(startingTemplate?.subject ?? '')
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
    PersonalNote: '',
    AdditionalRemarks: '',
    ClosingMessage: '',
    ...contextVariables,
  }))
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { busy: sending, progressMessage, run } = useWriteLifecycle()
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const selectedTemplate: MessageTemplate | undefined = templates.find(
    (item) => item.id === templateId,
  )
  const primaryRecipient = recipients[0]
  const liveRecipient =
    primaryRecipient?.personKind === 'rukn' || primaryRecipient?.personKind === 'karkun'
  // KC-0128 — live campaign / person variables from the Official Communication engine.
  const liveVariables = useMemo(() => {
    if (!primaryRecipient) return {} as Record<string, string>
    return buildOfficialCommunicationVariables(primaryRecipient)
  }, [primaryRecipient])

  // KC-0077.2.1 — Administrators edit freely; Rukn keeps official wording locked.
  // KC-0128 — Rukn live briefing also locks library wording (free-text slots only).
  const isLiveResolved = Boolean(liveRecipient && (selectedTemplate || templateId))
  const isOfficialLocked =
    (role === 'rukn' && Boolean(selectedTemplate?.isOfficial)) ||
    (isLiveResolved && mode === 'official' && Boolean(selectedTemplate))

  const variableKeys = selectedTemplate?.variables.length
    ? selectedTemplate.variables
    : TEMPLATE_PLACEHOLDER_KEYS.filter(
        (key) => message.includes(`{${key}}`) || subject.includes(`{${key}}`),
      )

  const editableVariableKeys = isLiveResolved
    ? variableKeys.filter((key) => FREE_TEXT_VARIABLE_KEYS.has(key))
    : variableKeys

  const mergedVariables = useMemo(() => {
    const freeText: Record<string, string> = {}
    for (const key of FREE_TEXT_VARIABLE_KEYS) {
      const value = placeholders[key]
      if (typeof value === 'string' && value.trim()) {
        freeText[key] = value.trim()
      }
    }
    if (isLiveResolved) {
      return {
        ...liveVariables,
        ...contextVariables,
        ...freeText,
        name:
          (typeof placeholders.name === 'string' && placeholders.name.trim()) ||
          recipients[0]?.name ||
          liveVariables.name ||
          '',
      }
    }
    return {
      ...liveVariables,
      ...placeholders,
      name: placeholders.name || recipients[0]?.name || liveVariables.name || '',
      ...contextVariables,
      ...freeText,
    }
  }, [placeholders, recipients, contextVariables, liveVariables, isLiveResolved])

  const previewSubject = useMemo(
    () => scrubZeroWidth(applyTemplateVariables(subject, mergedVariables)),
    [subject, mergedVariables],
  )
  const previewBody = useMemo(
    () => scrubZeroWidth(composeWhatsAppMessage(message, mergedVariables, footerMode)),
    [message, mergedVariables, footerMode],
  )
  const composedMessage = useMemo(
    () => combineSubjectAndBody(previewSubject, previewBody),
    [previewSubject, previewBody],
  )

  const singleRecipient = recipients.length === 1 && primaryRecipient
  const waLink = singleRecipient
    ? buildWhatsAppLink(
        primaryRecipient.whatsapp?.trim() ? primaryRecipient.whatsapp : primaryRecipient.mobile,
        composedMessage,
      )
    : null

  const audience = primaryRecipient?.personKind ?? 'karkun'

  const handleTemplateChange = (id: string) => {
    setTemplateId(id)
    setMode(id ? 'official' : 'custom')
    const template = templates.find((item) => item.id === id)
    if (template) {
      setSubject(template.subject ?? '')
      setMessage(template.body)
    } else {
      setSubject('')
      setMessage('')
    }
  }

  const handleSend = () => {
    setError('')
    setSuccess('')
    void run({
      key: `communication:send:${recipients.map((r) => r.personId).join(',')}`,
      queueLabels: ['communications'],
      work: async () => {
        const result = await onSend({
          templateId: templateId || undefined,
          message: composedMessage,
        })
        if (!result.success) {
          throw Object.assign(new Error(result.error ?? 'Unable to queue message.'), {
            code: 'unknown',
          })
        }
        return result
      },
    }).then((lifecycle) => {
      if (!lifecycle) return
      if (!lifecycle.ok) {
        setError(lifecycle.message)
        return
      }
      setSuccess('Message queued for delivery. Backend integration arrives in Sprint 16.')
      setTimeout(() => onClose(), 1200)
    })
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
          recommendedTemplateId={recommendedTemplateId}
          roleHint={role}
          onCustomTemplateSaved={(saved) => {
            setTemplates(refreshComposerTemplates())
            setTemplateId(saved.id)
            setMode('official')
            setSubject(saved.subject ?? '')
            setMessage(saved.body)
          }}
        />

        {editableVariableKeys.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {editableVariableKeys.map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-heading">{key}</label>
                <input
                  value={placeholders[key] ?? ''}
                  onChange={(event) =>
                    setPlaceholders((current) => ({ ...current, [key]: event.target.value }))
                  }
                  className={selectClassName}
                  placeholder={
                    FREE_TEXT_VARIABLE_KEYS.has(key) ? 'Optional free-text' : key
                  }
                />
              </div>
            ))}
          </div>
        )}

        {composedMessage ? (
          <div className="wa-preview">
            <p className="wa-preview-label">WhatsApp preview</p>
            {previewSubject ? (
              <div className="wa-preview-subject">
                <p className="wa-preview-meta">Subject</p>
                <p className="wa-preview-subject-text" dir="auto">
                  {previewSubject}
                </p>
              </div>
            ) : null}
            <div className="wa-preview-bubble" dir="auto" lang="ur">
              <p className="wa-preview-body">{previewBody}</p>
            </div>
            <p className="wa-preview-meta">
              {composedMessage.length} characters including footer (
              {footerMode === 'official' ? 'Administrator' : 'Personal'})
            </p>
          </div>
        ) : null}

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
              {sending ? progressMessage || 'محفوظ کیا جا رہا ہے...' : 'Queue Message'}
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
