import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useCommunication } from '@/hooks/useCommunication'
import type { MessageRecipient } from '@/types/communication'

type BroadcastComposerPanelProps = {
  recipients: MessageRecipient[]
}

export function BroadcastComposerPanel({ recipients }: BroadcastComposerPanelProps) {
  const { sendBroadcastMessage } = useCommunication()
  const [composerOpen, setComposerOpen] = useState(false)

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
      <h2 className="text-lg font-semibold text-text-heading">Broadcast Messages</h2>
      <p className="mt-2 text-sm text-secondary">
        Send WhatsApp messages to multiple Karkuns or Rukns. Select recipients from{' '}
        <Link to={ROUTES.ADMIN_KARKUN} className="font-medium text-primary hover:underline">
          Karkun bulk actions
        </Link>{' '}
        or{' '}
        <Link to={ROUTES.ADMIN_LISTS} className="font-medium text-primary hover:underline">
          Campaign Lists
        </Link>
        , then return here to compose.
      </p>

      <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-muted p-4">
        <p className="text-sm font-medium text-text-heading">
          {recipients.length > 0
            ? `${recipients.length} recipient${recipients.length === 1 ? '' : 's'} ready`
            : 'No recipients selected yet'}
        </p>
        {recipients.length === 0 && (
          <p className="mt-2 text-sm text-secondary">
            Go to Campaign Lists → Broadcast, or select Karkuns on the Karkun page and choose Send
            WhatsApp.
          </p>
        )}
        {recipients.length > 0 && (
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-sm text-secondary">
            {recipients.map((recipient) => (
              <li key={recipient.personId}>
                {recipient.name} · {recipient.mobile}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <PrimaryButton
          type="button"
          onClick={() => setComposerOpen(true)}
          disabled={recipients.length === 0}
        >
          Compose Broadcast
        </PrimaryButton>
      </div>

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
        title={`Broadcast to ${recipients.length} recipients`}
      />
    </section>
  )
}
