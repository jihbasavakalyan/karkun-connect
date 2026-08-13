/**
 * BATCH-06A / TASK-053 — Rukn → Admin one-way internal message.
 * Not an inbox. Not WhatsApp. Not a conversation thread.
 */

import { useState } from 'react'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useAuth } from '@/hooks/useAuth'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import { classifyWriteError } from '@/lib/reliability/writeLifecycle'
import { submitRuknAdminMessage } from '@/services/ruknAdminMessageService'
import { getRuknById } from '@/data/ruknMaster'

export function RuknMessageAdminPanel() {
  const ruknId = useRequiredRuknId()
  const { user } = useAuth()
  const { busy, progressMessage, run } = useWriteLifecycle()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const ruknName = (ruknId ? getRuknById(ruknId)?.name : '') || user?.displayName || ''

  const handleSubmit = () => {
    if (!ruknId) return
    setError('')
    setNotice('')
    void run({
      key: `rukn-admin-message:${ruknId}`,
      queueLabels: ['settings.ruknAdminMessages'],
      work: async () => {
        const result = await submitRuknAdminMessage({
          ruknId,
          ruknName,
          subject,
          body,
        })
        if (!result.ok) {
          throw Object.assign(new Error(result.error), { code: 'unknown' })
        }
        return result
      },
    }).then((lifecycle) => {
      if (!lifecycle) return
      if (!lifecycle.ok) {
        const classified = classifyWriteError(lifecycle.error ?? lifecycle.message)
        setError(classified.message)
        return
      }
      setBody('')
      setSubject('')
      setNotice('Message sent to Administrator.')
    })
  }

  return (
    <section
      className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-card"
      aria-label="Message Administrator"
    >
      <h2 className="text-base font-semibold text-text-heading">Message Administrator</h2>
      <p className="mt-1 text-sm text-secondary">
        Send a one-way internal note to Admin Inbox. This is not WhatsApp and not a chat.
      </p>

      {error ? (
        <div className="ds-banner-error mt-3" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="ds-banner-success mt-3" role="status">
          {notice}
        </div>
      ) : null}

      <label className="mt-3 block">
        <span className={FORM_LABEL_CLASS}>Subject (optional)</span>
        <input
          className={FORM_INPUT_CLASS}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Short subject"
          disabled={busy}
        />
      </label>
      <label className="mt-3 block">
        <span className={FORM_LABEL_CLASS}>Message</span>
        <textarea
          className={FORM_INPUT_CLASS}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a note for the Administrator…"
          disabled={busy}
        />
      </label>

      <div className="mt-3">
        <PrimaryButton type="button" disabled={busy || !body.trim()} onClick={handleSubmit}>
          {busy ? progressMessage || '…' : 'Send to Administrator'}
        </PrimaryButton>
      </div>
    </section>
  )
}
