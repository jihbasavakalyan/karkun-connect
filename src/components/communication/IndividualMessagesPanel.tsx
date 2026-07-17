import { useMemo, useState } from 'react'
import { getAllKarkuns } from '@/lib/peopleStore'
import { ruknMaster } from '@/data/ruknMaster'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useCommunication } from '@/hooks/useCommunication'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import {
  buildIndividualCommunicationContext,
  QUICK_COMMUNICATION_TEMPLATE_IDS,
} from '@/lib/communicationContext'
import { listTemplates } from '@/services/templateService'
import type { MessageRecipient, MessageRecipientKind } from '@/types/communication'

export function IndividualMessagesPanel() {
  const peopleVersion = usePeopleStore()
  const { sendIndividualMessage } = useCommunication()
  const [kind, setKind] = useState<MessageRecipientKind>('karkun')
  const [personId, setPersonId] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [preferredTemplateId, setPreferredTemplateId] = useState<string | undefined>()

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

  const context =
    kind === 'karkun' && personId
      ? buildIndividualCommunicationContext(personId)
      : null

  const quickTemplates = useMemo(
    () =>
      listTemplates().filter((template) =>
        QUICK_COMMUNICATION_TEMPLATE_IDS.includes(
          template.id as (typeof QUICK_COMMUNICATION_TEMPLATE_IDS)[number],
        ),
      ),
    [],
  )

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
      <h2 className="text-lg font-semibold text-text-heading">Individual Messages</h2>
      <p className="mt-2 text-sm text-secondary">
        Official Urdu WhatsApp templates with role-based footers. Placeholders are filled before
        send.
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

      {context && (
        <div className="mt-4 rounded-lg border border-border bg-surface-muted/50 px-4 py-3">
          <h3 className="text-sm font-semibold text-text-heading">Karkun context</h3>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-secondary">Assigned Rukn</dt>
              <dd className="font-medium text-text-heading">{context.assignedRuknName}</dd>
            </div>
            <div>
              <dt className="text-secondary">Journey Stage</dt>
              <dd className="font-medium text-text-heading">{context.journeyStage}</dd>
            </div>
            <div>
              <dt className="text-secondary">Last Visit</dt>
              <dd className="font-medium text-text-heading">{context.lastVisit}</dd>
            </div>
            <div>
              <dt className="text-secondary">Last Ijtema</dt>
              <dd className="font-medium text-text-heading">{context.lastIjtema}</dd>
            </div>
            <div>
              <dt className="text-secondary">Bait-ul-Maal Status</dt>
              <dd className="font-medium text-text-heading">{context.baitulMaalStatus}</dd>
            </div>
          </dl>

          {context.recommendedTemplate && (
            <div className="mt-3 rounded-lg border border-primary/30 bg-primary-muted/40 px-3 py-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">
                Digital Rafeeq recommendation
              </h4>
              <p className="mt-1 text-sm font-semibold text-text-heading">
                {context.recommendedTemplate.templateName}
              </p>
              <p className="text-xs text-secondary">{context.recommendedTemplate.reason}</p>
              <PrimaryButton
                type="button"
                className="mt-2"
                disabled={!recipient}
                onClick={() => {
                  setPreferredTemplateId(context.recommendedTemplate!.templateId)
                  setComposerOpen(true)
                }}
              >
                Review &amp; send suggested message
              </PrimaryButton>
            </div>
          )}

          {context.recommendations.length > 1 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Other suggestions
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-text-heading">
                {context.recommendations.slice(1).map((item) => (
                  <li key={item.templateId}>
                    <button
                      type="button"
                      className="text-primary underline-offset-2 hover:underline"
                      onClick={() => {
                        setPreferredTemplateId(item.templateId)
                        setComposerOpen(true)
                      }}
                    >
                      {item.templateName}
                    </button>
                    <span className="text-secondary"> — {item.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {kind === 'karkun' && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-text-heading">Quick Templates</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={!recipient}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-heading disabled:opacity-50"
                onClick={() => {
                  setPreferredTemplateId(template.id)
                  setComposerOpen(true)
                }}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <PrimaryButton
          type="button"
          disabled={!recipient}
          onClick={() => {
            setPreferredTemplateId(context?.recommendedTemplate?.templateId)
            setComposerOpen(true)
          }}
        >
          Compose WhatsApp
        </PrimaryButton>
      </div>

      {recipient && (
        <MessageComposerModal
          isOpen={composerOpen}
          recipients={[recipient]}
          role="administrator"
          initialTemplateId={preferredTemplateId}
          recommendedTemplateId={context?.recommendedTemplate?.templateId}
          contextVariables={context?.defaultVariables}
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
