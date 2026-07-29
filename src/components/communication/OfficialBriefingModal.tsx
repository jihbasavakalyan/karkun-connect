/**
 * KC-0129 / KC-0130 — One-click Official Briefing for a single Rukn.
 * Live campaign summary (same as Connections card) → intelligent Urdu → Preview → WhatsApp.
 */

import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { generateIntelligentOfficialBriefingUrdu } from '@/lib/communication/officialBriefingFromCampaign'
import { buildOfficialCampaignSummary } from '@/lib/ruknWorkspacePresentation'
import {
  launchWhatsAppWebMessage,
  prepareWhatsAppLaunchWindows,
} from '@/lib/communication/whatsappWebLaunch'
import { getActiveCampaignName } from '@/services/campaignService'
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

export function OfficialBriefingModal({
  isOpen,
  recipient,
  onClose,
}: OfficialBriefingModalProps) {
  const { busy, run } = useBusyAction()
  const [personalNote, setPersonalNote] = useState('')
  const [additionalRemarks, setAdditionalRemarks] = useState('')
  const [closingMessage, setClosingMessage] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const recipientId = recipient?.personId ?? ''

  useEffect(() => {
    if (!isOpen) return
    setPersonalNote('')
    setAdditionalRemarks('')
    setClosingMessage('')
    setError('')
    setStatus('')
  }, [isOpen, recipientId])

  const campaignName = useMemo(() => getActiveCampaignName() || 'مہم', [])

  const campaignSummary = useMemo(() => {
    if (!recipient || recipient.personKind !== 'rukn') return null
    return buildOfficialCampaignSummary(recipient.personId)
  }, [recipient])

  const messageBody = useMemo(() => {
    if (!recipient || !campaignSummary) return ''
    return generateIntelligentOfficialBriefingUrdu({
      ruknName: recipient.name,
      campaignName,
      summary: campaignSummary,
      freeText: {
        personalNote,
        additionalRemarks,
        closingMessage,
      },
    })
  }, [
    recipient,
    campaignSummary,
    campaignName,
    personalNote,
    additionalRemarks,
    closingMessage,
  ])

  if (!isOpen || !recipient) return null

  const handleOpenWhatsApp = () => {
    if (!messageBody.trim()) return
    const [launchWindow] = prepareWhatsAppLaunchWindows(1)
    void run(
      async () => {
        setError('')
        setStatus('')
        const message = scrubPreview(messageBody)
        const launch = launchWhatsAppWebMessage(recipient, message, launchWindow)
        if (!launch.launched) {
          setError(launch.reason ?? 'Unable to open WhatsApp.')
          return
        }
        const result = await sendIndividualMessage({
          channel: 'whatsapp',
          recipient,
          templateId: 'live-campaign-briefing',
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

  const overall = campaignSummary?.overallStatus

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
            disabled={busy || !messageBody.trim() || !recipient.mobile.trim()}
          >
            Open WhatsApp
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-3">
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
            <p className={FORM_LABEL_CLASS}>Campaign</p>
            <p className="mt-1 font-medium text-text-heading">{campaignName}</p>
          </div>
          <div>
            <p className={FORM_LABEL_CLASS}>Overall Status</p>
            {overall ? (
              <div className="mt-1">
                <StatusBadge variant={overall.badgeVariant}>
                  <span aria-hidden="true">{overall.icon}</span> {overall.label}
                </StatusBadge>
              </div>
            ) : (
              <p className="mt-1 text-secondary">-</p>
            )}
          </div>
        </div>

        {campaignSummary ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-border bg-surface-muted/40 px-3 py-2 text-xs sm:grid-cols-3">
            <div className="flex justify-between gap-2">
              <dt className="text-secondary">Connected</dt>
              <dd className="font-semibold tabular-nums">{campaignSummary.connectedKarkuns}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-secondary">Pending Visits</dt>
              <dd className="font-semibold tabular-nums">{campaignSummary.pendingVisits}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-secondary">Pending Ijtema</dt>
              <dd className="font-semibold tabular-nums">{campaignSummary.pendingWeeklyIjtema}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-secondary">Pending Baitul Maal</dt>
              <dd className="font-semibold tabular-nums">
                {campaignSummary.pendingMonthlyBaitulMaal}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-secondary">Pending App</dt>
              <dd className="font-semibold tabular-nums">
                {campaignSummary.pendingAppRegistration}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-secondary">Last Communication</dt>
              <dd className="font-semibold">{campaignSummary.lastCommunication}</dd>
            </div>
          </dl>
        ) : null}

        <div>
          <p className={FORM_LABEL_CLASS}>Generated WhatsApp Message</p>
          <div className="wa-preview mt-2">
            <p className="wa-preview-label">WhatsApp preview</p>
            <div className="wa-preview-bubble" dir="rtl" lang="ur">
              <p className="wa-preview-body whitespace-pre-wrap">{messageBody}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-1">
          <div>
            <label htmlFor="kc0130-personal-note" className={FORM_LABEL_CLASS}>
              Personal Note <span className="font-normal text-secondary">(optional)</span>
            </label>
            <textarea
              id="kc0130-personal-note"
              value={personalNote}
              onChange={(event) => {
                setPersonalNote(event.target.value)
                setStatus('')
              }}
              rows={2}
              placeholder="Add a short personal note…"
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base leading-relaxed text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor="kc0130-additional-remarks" className={FORM_LABEL_CLASS}>
              Additional Remarks <span className="font-normal text-secondary">(optional)</span>
            </label>
            <textarea
              id="kc0130-additional-remarks"
              value={additionalRemarks}
              onChange={(event) => {
                setAdditionalRemarks(event.target.value)
                setStatus('')
              }}
              rows={2}
              placeholder="Optional remarks…"
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base leading-relaxed text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor="kc0130-closing-message" className={FORM_LABEL_CLASS}>
              Closing Message <span className="font-normal text-secondary">(optional)</span>
            </label>
            <textarea
              id="kc0130-closing-message"
              value={closingMessage}
              onChange={(event) => {
                setClosingMessage(event.target.value)
                setStatus('')
              }}
              rows={2}
              placeholder="Override closing line…"
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base leading-relaxed text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={busy}
            />
          </div>
        </div>

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
