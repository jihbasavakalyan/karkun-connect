/**
 * KC-0118 — Open context-aware Communication Preview from any operational screen.
 */

import { useCallback, useState } from 'react'
import { ContextAwareCommunicationPreviewModal } from '@/components/communication/ContextAwareCommunicationPreviewModal'
import {
  generateContextAwareCommunication,
  type CommunicationContextId,
  type ContextAwarePendingMatter,
  type GeneratedCommunication,
} from '@/lib/communication/contextAware'
import type { MessageRecipient } from '@/types/communication'

export type OpenContextAwareCommunicationOptions = {
  context: CommunicationContextId
  recipients?: MessageRecipient[]
  pendingMatters?: ContextAwarePendingMatter[]
  audienceLabel?: string
}

export function useContextAwareCommunication() {
  const [draft, setDraft] = useState<GeneratedCommunication | null>(null)
  const [open, setOpen] = useState(false)

  const openCommunication = useCallback((options: OpenContextAwareCommunicationOptions) => {
    const next = generateContextAwareCommunication(options.context, {
      recipients: options.recipients,
      pendingMatters: options.pendingMatters,
      audienceLabel: options.audienceLabel,
    })
    setDraft(next)
    setOpen(true)
  }, [])

  const closeCommunication = useCallback(() => {
    setOpen(false)
    setDraft(null)
  }, [])

  const previewModal = (
    <ContextAwareCommunicationPreviewModal
      isOpen={open}
      draft={draft}
      onClose={closeCommunication}
      onDraftChange={setDraft}
    />
  )

  return {
    openCommunication,
    closeCommunication,
    previewModal,
    isOpen: open,
  }
}
