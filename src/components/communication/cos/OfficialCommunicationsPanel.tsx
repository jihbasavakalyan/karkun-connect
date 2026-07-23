/**
 * KC-0099 — Official Communications workspace.
 * Workflow: Recipient → Official Communication → Review (read-only) → Send.
 * Variables auto-resolve — Admin never edits placeholders.
 */

import { useEffect, useMemo, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { getAllRukns } from '@/lib/peopleStore'
import {
  buildOfficialCommunicationPreview,
  listOfficialCommunications,
  shouldSuggestCampaignInitiation,
} from '@/lib/communication/officialCommunicationEngine'
import {
  launchWhatsAppWebMessage,
  prepareWhatsAppLaunchWindows,
} from '@/lib/communication/whatsappWebLaunch'
import { sendIndividualMessage } from '@/services/communicationService'
import { useBusyAction } from '@/hooks/useBusyAction'
import type { MessageRecipient } from '@/types/communication'

export function OfficialCommunicationsPanel() {
  const rukns = useMemo(() => getAllRukns().filter((rukn) => !rukn.isArchived), [])
  const library = useMemo(() => listOfficialCommunications(), [])
  const { busy, run } = useBusyAction()

  const [ruknId, setRuknId] = useState(rukns[0]?.id ?? '')
  const [templateId, setTemplateId] = useState(library[0]?.id ?? '')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ruknId && rukns[0]) setRuknId(rukns[0].id)
  }, [ruknId, rukns])

  useEffect(() => {
    if (!templateId && library[0]) setTemplateId(library[0].id)
  }, [templateId, library])

  const selectedRukn = rukns.find((rukn) => rukn.id === ruknId)
  const recipient: MessageRecipient | null = selectedRukn
    ? {
        personId: selectedRukn.id,
        personKind: 'rukn',
        name: selectedRukn.name,
        mobile: selectedRukn.mobile,
        whatsapp: selectedRukn.whatsapp,
      }
    : null

  const preview = useMemo(() => {
    if (!recipient || !templateId) return null
    return buildOfficialCommunicationPreview(recipient, templateId)
  }, [recipient, templateId])

  const suggestInitiation = ruknId ? shouldSuggestCampaignInitiation(ruknId) : false

  const handleSend = () => {
    if (!recipient || !preview || 'error' in preview) return
    const [launchWindow] = prepareWhatsAppLaunchWindows(1)
    void run(
      async () => {
        setError('')
        setStatus('')
        const message = preview.body
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
        setStatus('Official Communication queued. Review the WhatsApp window before sending.')
      },
      { key: `oc-send:${recipient.personId}:${templateId}`, minMs: 400 },
    )
  }

  return (
    <div className="space-y-4">
      <header className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Official Communication System
        </p>
        <h2 className="mt-1 text-lg font-semibold text-text-heading">Official Communications</h2>
        <p className="mt-1 text-sm text-secondary">
          Jamaat-approved language for ذمہ داری، پیش رفت، اجتماعی کوشش، رہنمائی، and اقامتِ دین.
          Select a recipient and communication — variables resolve automatically.
        </p>
      </header>

      <section
        className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
        aria-label="Send Official Communication"
      >
        <h3 className="text-sm font-semibold text-text-heading">Send workflow</h3>
        <p className="mt-1 text-xs text-secondary">
          Recipient → Official Communication → Review → Send. No manual variable entry.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-text-heading">Recipient (Rukn)</span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
              value={ruknId}
              onChange={(event) => {
                setRuknId(event.target.value)
                setStatus('')
                setError('')
              }}
              disabled={busy}
            >
              {rukns.length === 0 ? (
                <option value="">No Rukns available</option>
              ) : (
                rukns.map((rukn) => (
                  <option key={rukn.id} value={rukn.id}>
                    {rukn.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-text-heading">Official Communication</span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
              value={templateId}
              onChange={(event) => {
                setTemplateId(event.target.value)
                setStatus('')
                setError('')
              }}
              disabled={busy}
            >
              {library.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {suggestInitiation ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Suggested: Campaign Initiation Pending — this Rukn has an assignment with no campaign
            progress yet.
            <SecondaryButton
              type="button"
              className="ml-2 px-2 py-1 text-xs"
              disabled={busy}
              onClick={() => setTemplateId('tpl-oc-campaign-initiation-pending')}
            >
              Use suggestion
            </SecondaryButton>
          </p>
        ) : null}

        {preview && 'error' in preview ? (
          <p className="mt-3 text-sm text-red-700">{preview.error}</p>
        ) : preview ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2 text-[11px] text-secondary">
              <span className="rounded-full border border-border px-2 py-0.5">
                Campaign: {preview.campaignName}
              </span>
              <span className="rounded-full border border-border px-2 py-0.5">
                Auto-filled · read-only preview
              </span>
              {preview.language.ok ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800">
                  Language standard ✓
                </span>
              ) : (
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-800">
                  Language review needed
                </span>
              )}
            </div>
            <pre
              className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-muted p-3 text-sm leading-relaxed text-text-heading urdu-text"
              dir="rtl"
              lang="ur"
            >
              {preview.body}
            </pre>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="button" onClick={handleSend} disabled={busy || !recipient} loading={busy}>
                {busy ? 'Preparing…' : 'Send Official Communication'}
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="mt-3 text-sm text-emerald-800" role="status">
            {status}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
        aria-label="Official Communication Library"
      >
        <h3 className="text-sm font-semibold text-text-heading">Official Communication Library</h3>
        <p className="mt-1 text-xs text-secondary">
          Approved communications — not CRM templates. Custom Communications remain under Messaging
          Tools.
        </p>
        <ul className="mt-3 divide-y divide-border">
          {library.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-text-heading">{item.name}</p>
                {item.subject ? (
                  <p className="text-xs text-secondary">{item.subject}</p>
                ) : null}
              </div>
              <SecondaryButton
                type="button"
                className="shrink-0 px-2.5 py-1 text-xs"
                disabled={busy}
                onClick={() => {
                  setTemplateId(item.id)
                  setStatus('')
                  setError('')
                }}
              >
                Select
              </SecondaryButton>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
