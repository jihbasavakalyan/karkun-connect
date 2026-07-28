/**
 * KC-0118 / KC-0119 — Communication Preview modal.
 * Editorial Validator → Review / Edit / Revalidate → Channel → Send / Cancel.
 * Logic lives in CommunicationEngine services — not hardcoded here.
 */

import { useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { useAuth } from '@/hooks/useAuth'
import {
  recipientTypeLabel,
  revalidateContextAwareMessage,
  sendContextAwareCommunication,
  type ContextAwareDeliveryChannel,
  type GeneratedCommunication,
} from '@/lib/communication/contextAware'

type ContextAwareCommunicationPreviewModalProps = {
  isOpen: boolean
  draft: GeneratedCommunication | null
  onClose: () => void
  onDraftChange?: (draft: GeneratedCommunication) => void
}

export function ContextAwareCommunicationPreviewModal({
  isOpen,
  draft,
  onClose,
  onDraftChange,
}: ContextAwareCommunicationPreviewModalProps) {
  const { user } = useAuth()
  const draftKey = draft
    ? `${draft.context}|${draft.audienceLabel}|${draft.generatedMessage.length}|${draft.recipients.map((r) => r.personId).join(',')}`
    : ''
  const [message, setMessage] = useState(draft?.message ?? '')
  const [channel, setChannel] = useState<ContextAwareDeliveryChannel>(
    draft?.defaultChannel ?? 'whatsapp',
  )
  const [editorial, setEditorial] = useState(draft?.editorial ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [syncedKey, setSyncedKey] = useState(draftKey)

  if (draft && draftKey !== syncedKey) {
    setSyncedKey(draftKey)
    setMessage(draft.message)
    setChannel(draft.defaultChannel)
    setEditorial(draft.editorial)
    setError('')
    setNotice('')
  }

  if (!draft || !editorial) return null

  const recipientSummary =
    draft.recipients.length === 0
      ? draft.audienceLabel
      : draft.recipients.length === 1
        ? `${draft.recipients[0].name} (${draft.recipients[0].mobile || 'no mobile'})`
        : `${draft.audienceLabel} — ${draft.recipients.length} recipients`

  const handleRevalidate = () => {
    const next = revalidateContextAwareMessage(draft, message)
    setEditorial(next.editorial)
    onDraftChange?.(next)
    setError('')
    setNotice(
      next.editorial.ok
        ? 'Editorial Approved — message is ready to send.'
        : 'Editorial Review Required — see failed rules below.',
    )
  }

  const handleSend = () => {
    setError('')
    setNotice('')
    const validated = revalidateContextAwareMessage(draft, message)
    setEditorial(validated.editorial)
    onDraftChange?.(validated)
    if (!validated.editorial.ok) {
      setError('Editorial Review Required — fix the listed rules, then Revalidate before Send.')
      return
    }

    setBusy(true)
    void sendContextAwareCommunication({
      draft: validated,
      message,
      channel,
      sentBy: user?.displayName?.trim() || user?.email || user?.phone || 'Administrator',
    })
      .then(({ delivery }) => {
        if (!delivery.ok && delivery.status !== 'prepared') {
          setError(delivery.detail)
          return
        }
        setNotice(`${delivery.detail} History recorded.`)
        window.setTimeout(() => onClose(), 800)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Send failed.')
      })
      .finally(() => setBusy(false))
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Communication Preview"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={busy}>
            Cancel
          </SecondaryButton>
          <SecondaryButton type="button" onClick={handleRevalidate} disabled={busy}>
            Revalidate
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={handleSend}
            loading={busy}
            disabled={busy || !message.trim() || !editorial.ok}
          >
            Send
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4 text-sm" dir="auto">
        <div
          className={[
            'rounded-lg border px-3 py-2',
            editorial.ok
              ? 'border-primary/30 bg-primary-muted/40 text-primary'
              : 'border-error-border bg-error-bg text-error',
          ].join(' ')}
          role="status"
        >
          <p className="font-semibold">{editorial.status}</p>
          {!editorial.ok ? (
            <ul className="mt-2 list-disc space-y-1 ps-5">
              {editorial.failedRules.map((rule) => (
                <li key={rule.id}>
                  <span className="font-medium">{rule.label}:</span> {rule.detail}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs opacity-90">Editorial Validator passed all rules.</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className={FORM_LABEL_CLASS}>Recipient</p>
            <p className="mt-1 font-medium text-text-heading">{recipientSummary}</p>
            <p className="mt-0.5 text-xs text-secondary">
              Type: {recipientTypeLabel(draft.recipientType)}
            </p>
          </div>
          <div>
            <p className={FORM_LABEL_CLASS}>Communication Type</p>
            <p className="mt-1 font-medium text-text-heading">{draft.communicationTypeLabel}</p>
          </div>
        </div>

        <div>
          <p className={FORM_LABEL_CLASS}>Delivery Channel</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {draft.supportedChannels.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setChannel(option)}
                className={[
                  'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                  channel === option
                    ? 'border-primary bg-primary-muted text-primary'
                    : 'border-border bg-surface text-secondary hover:border-primary/30',
                ].join(' ')}
              >
                {option === 'whatsapp' ? 'WhatsApp' : 'SMS'}
              </button>
            ))}
          </div>
          {channel === 'sms' ? (
            <p className="mt-1 text-xs text-secondary">
              SMS gateway is prepared for a later phase — Send will mark the message as Prepared.
            </p>
          ) : (
            <p className="mt-1 text-xs text-secondary">
              Opens WhatsApp Web / wa.me with this message (not WhatsApp Business API).
            </p>
          )}
        </div>

        {draft.pendingMatters.length > 0 ? (
          <div className="comm-pending-panel">
            <p className={FORM_LABEL_CLASS}>Pending responsibilities</p>
            <ul className="mt-2 list-disc space-y-1.5 ps-5 text-secondary">
              {draft.pendingMatters.slice(0, 8).map((matter) => (
                <li key={matter.id}>{matter.label}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <label htmlFor="kc0119-generated-message" className={FORM_LABEL_CLASS}>
            Generated Message
          </label>
          <p className="mt-0.5 text-xs text-secondary">Edit Message (optional), then Revalidate</p>
          <div className="wa-preview mt-2">
            <p className="wa-preview-label">WhatsApp preview</p>
            <div className="wa-preview-bubble" dir="rtl" lang="ur">
              <p className="wa-preview-body whitespace-pre-wrap">{message}</p>
            </div>
          </div>
          <textarea
            id="kc0119-generated-message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)
              setNotice('')
            }}
            rows={10}
            className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 font-[inherit] text-base leading-relaxed text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            dir="rtl"
            lang="ur"
          />
        </div>

        {error ? <p className="text-sm text-error">{error}</p> : null}
        {notice ? <p className="text-sm text-primary">{notice}</p> : null}
      </div>
    </Modal>
  )
}
