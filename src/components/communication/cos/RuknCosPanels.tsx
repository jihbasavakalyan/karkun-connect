import { CosPlaceholderPanel } from '@/components/communication/cos/CosPlaceholderPanel'
import { DigitalRafeeqGuidancePanel } from '@/components/communication/cos/DigitalRafeeqGuidancePanel'

export function RuknConversationsPanel() {
  return (
    <CosPlaceholderPanel
      title="Conversations"
      description="Relationship threads with Connected Karkuns will live here — organized by person, not by channel."
    />
  )
}

export function RuknFollowUpsPanel() {
  return (
    <CosPlaceholderPanel
      title="Follow-ups"
      description="Promised next contacts across your Connected Karkuns."
    >
      <ul className="space-y-2 text-sm text-secondary">
        <li className="rounded-lg border border-dashed border-border px-3 py-2">
          Follow-up visit — placeholder
        </li>
        <li className="rounded-lg border border-dashed border-border px-3 py-2">
          Ijtema reminder — placeholder
        </li>
      </ul>
    </CosPlaceholderPanel>
  )
}

export function RuknCompanionLedgerPanel() {
  return (
    <CosPlaceholderPanel
      title="Companion Ledger"
      description="Service memory for promises, visits, and continuity. Persistence arrives in a later sprint."
    />
  )
}

export function RuknVisitPlanningPanel() {
  return (
    <CosPlaceholderPanel
      title="Visit Planning"
      description="Plan visits around Connected Karkuns — not around messaging channels."
    />
  )
}

export function RuknNotesPanel() {
  return (
    <CosPlaceholderPanel
      title="Notes"
      description="Personal notes that help you serve Connected Karkuns with continuity."
    />
  )
}

export function RuknRafeeqSectionPanel() {
  return <DigitalRafeeqGuidancePanel />
}
