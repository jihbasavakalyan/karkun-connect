/**
 * KC-0129 — One-click Official Briefing for a single Rukn.
 * Workflow: Review → Optional Personal Note → Open WhatsApp → Send.
 * No template picker, library, or variable editor.
 */

import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { buildOfficialCommunicationPreview } from '@/lib/communication/officialCommunicationEngine'
import { resolveOfficialBriefingTemplateId } from '@/lib/ruknWorkspacePresentation'
import {
  launchWhatsAppWebMessage,
  prepareWhatsAppLaunchWindows,
} from '@/lib/communication/whatsappWebLaunch'
import { sendIndividualMessage } from '@/services/communicationService'
import { useBusyAction } from '@/hooks/useBusyAction'
import type { MessageRecipient } from '@/types/communication'

type OfficialBriefingModalProps = {
  isOpen: boolean
  recipient: MessageRecipient | null
  onClose: () => void
}

function scrubPreview(text: string): string {
  return text
    .replace(/\u200b/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}

function appendPersonalNote(body: string, note: string): string {
  const trimmedNote = note.trim()
  const base = scrubPreview(body)
  if (!trimmedNote) return base
  return `${base}\n\n${trimmedNote}`
}

export function OfficialBriefingModal({
  isOpen,
  recipient,
  onClose,
}: OfficialBriefingModalProps) {
  const { busy, run } = useBusyAction()
  const [personalNote, setPersonalNote] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const recipientId = recipient?.personId ?? ''

  useEffect(() => {
    if (!isOpen) return
    setPersonalNote('')
    setError('')
    setStatus('')
  }, [isOpen, recipientId])

  const preview = useMemo(() => {
    if (!recipient) return null
    const templateId = resolveOfficialBriefingTemplateId(recipient.personId)
    return buildOfficialCommunicationPreview(recipient, templateId)
  }, [recipient])

  if (!isOpen || !recipient) return null

  const handleOpenWhatsApp = () => {
    if (!preview || 'error' in preview) return
    const [launchWindow] = prepareWhatsAppLaunchWindows(1)
    void run(
      async () => {
        setError('')
        setStatus('')
        const message = appendPersonalNote(preview.body, personalNote)
        const launch = launchWhatsAppWebMessage(recipient, message, launchWindow)
        if (!launch.launched) {
          setError(launch.reason ?? 'Unable to open WhatsApp.')
          return
        }
        const result = await sendIndividualMessage({
          channel: 'whatsapp',
          recipient,
          templateId: preview.template.id,
          message,
        })
        if (!result.success) {
          setError(result.error)
          return
        }
        setStatus('WhatsApp opened. Review the message, then send.')
        window.setTimeout(() => onClose(), 900)
      },
      { key: `oc-briefing:${recipient.personId}`, minMs: 400 },
    )
  }

  const previewError = preview && 'error' in preview ? preview.error : null
  const previewOk = preview && !('error' in preview) ? preview : null
  const finalPreview = previewOk
    ? appendPersonalNote(previewOk.body, personalNote)
    : ''

  return (
    <Modal
      isOpen={isOpen}
      title="Official Briefing"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={busy}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={handleOpenWhatsApp}
            loading={busy}
            disabled={busy || !previewOk || !recipient.mobile.trim()}
          >
            Open WhatsApp
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className={FORM_LABEL_CLASS}>Recipient</p>
            <p className="mt-1 font-medium text-text-heading">
              {recipient.name}
              <span className="mt-0.5 block text-xs font-normal text-secondary">
                {recipient.mobile.trim() || 'Mobile Not Added'}
              </span>
            </p>
          </div>
          <div>
            <p className={FORM_LABEL_CLASS}>Briefing</p>
            <p className="mt-1 font-medium text-text-heading">
              {previewOk?.template.name ?? 'Official Communication'}
            </p>
            {previewOk ? (
              <p className="mt-0.5 text-xs text-secondary">
                Campaign: {previewOk.campaignName} · Auto-generated
              </p>
            ) : null}
          </div>
        </div>

        {previewError ? (
          <p className="text-sm text-error" role="alert">
            {previewError}
          </p>
        ) : null}

        {previewOk ? (
          <>
            <div>
              <p className={FORM_LABEL_CLASS}>Review</p>
              <div className="wa-preview mt-2">
                <p className="wa-preview-label">WhatsApp preview</p>
                <div className="wa-preview-bubble" dir="rtl" lang="ur">
                  <p className="wa-preview-body whitespace-pre-wrap">{finalPreview}</p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="kc0129-personal-note" className={FORM_LABEL_CLASS}>
                Personal Note <span className="font-normal text-secondary">(optional)</span>
              </label>
              <textarea
                id="kc0129-personal-note"
                value={personalNote}
                onChange={(event) => {
                  setPersonalNote(event.target.value)
                  setStatus('')
                }}
                rows={3}
                placeholder="Add a short personal note…"
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base leading-relaxed text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={busy}
              />
            </div>
          </>
        ) : null}

        {!recipient.mobile.trim() ? (
          <p className="text-sm text-error" role="alert">
            This Rukn has no mobile number for WhatsApp.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="text-sm text-primary" role="status">
            {status}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
