import { useState } from 'react'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { Icon } from '@/components/ui/Icon'
import { buildTelLink } from '@/utils/personContactLinks'
import type { MessageRecipientKind } from '@/types/communication'

type CommunicationActionsProps = {
  personId: string
  personKind: MessageRecipientKind
  name: string
  mobile: string
  whatsapp?: string
  onSend?: (input: { templateId?: string; message: string }) => Promise<{ success: boolean; error?: string }>
}

export const COMMUNICATION_CONTACT_ACTION_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-heading transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'

export function CommunicationActions({
  personId,
  personKind,
  name,
  mobile,
  whatsapp,
  onSend,
}: CommunicationActionsProps) {
  const [composerOpen, setComposerOpen] = useState(false)
  const telLink = buildTelLink(mobile)
  const hasMobile = Boolean(mobile.trim())

  if (!hasMobile && !onSend) {
    return null
  }

  const recipient = {
    personId,
    personKind,
    name,
    mobile,
    whatsapp,
  }

  return (
    <>
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label={`Contact ${name}`}>
        {telLink && (
          <a href={telLink} className={COMMUNICATION_CONTACT_ACTION_CLASS} aria-label={`Call ${name}`}>
            <Icon name="phone" size="sm" />
            Call
          </a>
        )}
        <button
          type="button"
          className={COMMUNICATION_CONTACT_ACTION_CLASS}
          disabled={!hasMobile || !onSend}
          aria-label={`WhatsApp ${name}`}
          title={onSend ? 'Compose WhatsApp message' : 'Communication service unavailable'}
          onClick={() => setComposerOpen(true)}
        >
          <Icon name="message" size="sm" />
          WhatsApp
        </button>
      </div>

      {onSend && (
        <MessageComposerModal
          isOpen={composerOpen}
          recipients={[recipient]}
          onClose={() => setComposerOpen(false)}
          onSend={onSend}
          title={`WhatsApp — ${name}`}
        />
      )}
    </>
  )
}
