/**
 * KC-0060 — Broadcast composer with permanent Arkaan recipient group.
 */

import { useMemo, useState } from 'react'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  ARKAAN_GROUP_NAME,
  getArkaanRecipientGroup,
} from '@/lib/communication/arkaanRecipientGroup'
import { useCommunication } from '@/hooks/useCommunication'
import type { MessageRecipient } from '@/types/communication'

type BroadcastComposerPanelProps = {
  /** Optional override; defaults to the permanent Arkaan group. */
  recipients?: MessageRecipient[]
}

export function BroadcastComposerPanel({ recipients: recipientsProp }: BroadcastComposerPanelProps) {
  const { sendBroadcastMessage } = useCommunication()
  const [composerOpen, setComposerOpen] = useState(false)
  const arkaanGroup = useMemo(() => getArkaanRecipientGroup(), [])
  const recipients = recipientsProp ?? arkaanGroup.recipients

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
      <h2 className="text-lg font-semibold text-text-heading">Broadcast Messages</h2>
      <p className="mt-2 text-sm text-secondary">
        The permanent <strong>{ARKAAN_GROUP_NAME}</strong> group is resolved automatically from Rukn
        Master. Administrators do not re-select Arkaan recipients each day.
      </p>

      <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-muted p-4">
        <p className="text-sm font-medium text-text-heading">
          {ARKAAN_GROUP_NAME} · {recipients.length} recipient
          {recipients.length === 1 ? '' : 's'} ready
        </p>
        <p className="mt-1 text-xs text-secondary">
          Permanent group · source: Rukn Master · auto-resolved
        </p>
        {recipients.length === 0 ? (
          <p className="mt-2 text-sm text-secondary">
            No active Rukns with mobile numbers are available in Rukn Master.
          </p>
        ) : (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-secondary">
            {recipients.map((recipient) => (
              <li key={recipient.personId}>
                {recipient.name} · {recipient.mobile}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton
          type="button"
          onClick={() => setComposerOpen(true)}
          disabled={recipients.length === 0}
        >
          Compose Broadcast to Arkaan
        </PrimaryButton>
        <SecondaryButton type="button" disabled title="Coming in next release">
          Custom recipient list
        </SecondaryButton>
      </div>
      <p className="mt-2 text-xs text-secondary">Custom recipient lists — Coming in next release</p>

      <MessageComposerModal
        isOpen={composerOpen}
        recipients={recipients}
        onClose={() => setComposerOpen(false)}
        onSend={async (input) => {
          const result = await sendBroadcastMessage({
            channel: 'whatsapp',
            recipients,
            templateId: input.templateId,
            message: input.message,
          })
          if (result.success === 0 && result.failed.length > 0) {
            return { success: false, error: result.failed[0]?.error ?? 'Broadcast failed.' }
          }
          return { success: true }
        }}
        title={`Broadcast to ${ARKAAN_GROUP_NAME} (${recipients.length})`}
      />
    </section>
  )
}
