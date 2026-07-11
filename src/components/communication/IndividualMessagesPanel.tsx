import { useMemo, useState } from 'react'
import { getAllKarkuns } from '@/lib/peopleStore'
import { ruknMaster } from '@/data/ruknMaster'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useCommunication } from '@/hooks/useCommunication'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import type { MessageRecipient, MessageRecipientKind } from '@/types/communication'

export function IndividualMessagesPanel() {
  const peopleVersion = usePeopleStore()
  const { sendIndividualMessage } = useCommunication()
  const [kind, setKind] = useState<MessageRecipientKind>('karkun')
  const [personId, setPersonId] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)

  const options = useMemo(() => {
    if (kind === 'karkun') {
      return getAllKarkuns()
        .filter((k) => !k.isArchived && k.mobile.trim())
        .map((k) => ({ id: k.id, name: k.name, mobile: k.mobile, whatsapp: k.whatsapp }))
    }
    return ruknMaster
      .filter((r) => r.status === 'active' && r.mobile.trim())
      .map((r) => ({ id: r.id, name: r.name, mobile: r.mobile, whatsapp: r.whatsapp }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registry is module state
  }, [kind, peopleVersion])

  const selected = options.find((option) => option.id === personId)
  const recipient: MessageRecipient | null = selected
    ? {
        personId: selected.id,
        personKind: kind,
        name: selected.name,
        mobile: selected.mobile,
        whatsapp: selected.whatsapp,
      }
    : null

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
      <h2 className="text-lg font-semibold text-text-heading">Individual Messages</h2>
      <p className="mt-2 text-sm text-secondary">
        Send a WhatsApp message to a single Karkun or Rukn via the Communication Engine.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-heading">Recipient type</label>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as MessageRecipientKind)
              setPersonId('')
            }}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
          >
            <option value="karkun">Karkun</option>
            <option value="rukn">Rukn</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-heading">Select recipient</label>
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
          >
            <option value="">Choose…</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} · {option.mobile}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <PrimaryButton type="button" disabled={!recipient} onClick={() => setComposerOpen(true)}>
          Compose WhatsApp
        </PrimaryButton>
      </div>

      {recipient && (
        <MessageComposerModal
          isOpen={composerOpen}
          recipients={[recipient]}
          onClose={() => setComposerOpen(false)}
          onSend={async (input) => {
            const result = await sendIndividualMessage({
              channel: 'whatsapp',
              recipient,
              templateId: input.templateId,
              message: input.message,
            })
            return result.success
              ? { success: true }
              : { success: false, error: result.error }
          }}
          title={`WhatsApp — ${recipient.name}`}
        />
      )}
    </section>
  )
}
