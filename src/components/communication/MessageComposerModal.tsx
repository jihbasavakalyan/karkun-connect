import { useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { applyTemplateVariables, listTemplates } from '@/services/templateService'
import type { MessageRecipient } from '@/types/communication'
import { TEMPLATE_CATEGORY_LABELS } from '@/types/communication'

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

type MessageComposerModalProps = {
  isOpen: boolean
  recipients: MessageRecipient[]
  onClose: () => void
  onSend: (input: { templateId?: string; message: string }) => Promise<{ success: boolean; error?: string }>
  title?: string
}

export function MessageComposerModal({
  isOpen,
  recipients,
  onClose,
  onSend,
  title = 'Compose WhatsApp Message',
}: MessageComposerModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <MessageComposerModalContent
      key={`${title}-${recipients.map((r) => r.personId).join(',')}`}
      recipients={recipients}
      onClose={onClose}
      onSend={onSend}
      title={title}
    />
  )
}

function MessageComposerModalContent({
  recipients,
  onClose,
  onSend,
  title = 'Compose WhatsApp Message',
}: Omit<MessageComposerModalProps, 'isOpen'>) {
  const templates = listTemplates()
  const [templateId, setTemplateId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sending, setSending] = useState(false)

  const primaryRecipient = recipients[0]

  const previewMessage = useMemo(() => {
    if (!primaryRecipient) return message
    return applyTemplateVariables(message, {
      name: primaryRecipient.name,
      ruknName: 'Rukn',
      assignmentNumber: 'ASN-000000',
      date: new Date().toISOString().slice(0, 10),
      purpose: 'Follow-up',
      headline: 'Campaign Update',
      details: 'Details here',
      message: message,
    })
  }, [message, primaryRecipient])

  const handleTemplateChange = (id: string) => {
    setTemplateId(id)
    const template = templates.find((item) => item.id === id)
    if (template) {
      setMessage(template.body)
    }
  }

  const handleSend = async () => {
    setError('')
    setSuccess('')
    setSending(true)
    const result = await onSend({ templateId: templateId || undefined, message })
    setSending(false)
    if (!result.success) {
      setError(result.error ?? 'Unable to queue message.')
      return
    }
    setSuccess('Message queued for delivery. Backend integration arrives in Sprint 16.')
    setTimeout(() => onClose(), 1200)
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
                {template.name} ({TEMPLATE_CATEGORY_LABELS[template.category]})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="composer-message" className="text-sm font-medium text-text-heading">
            Message
          </label>
          <textarea
            id="composer-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            className={selectClassName}
            placeholder="Type your message..."
          />
          <p className="text-xs text-secondary">{message.length} characters</p>
        </div>

        {message && (
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">Preview</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-text-heading">{previewMessage}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose} disabled={sending}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSend} disabled={sending || !message.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
