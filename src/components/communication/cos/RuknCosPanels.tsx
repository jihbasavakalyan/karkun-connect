import { CosPlaceholderPanel } from '@/components/communication/cos/CosPlaceholderPanel'
import { DigitalRafeeqGuidancePanel } from '@/components/communication/cos/DigitalRafeeqGuidancePanel'
import { TodaysActionsPanel } from '@/components/communication/cos/TodaysActionsPanel'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export function RuknConversationsPanel() {
  return (
    <CosPlaceholderPanel
      title="Conversations"
      description="Relationship threads with Connected Karkuns will live here — organized by person, not by channel."
    />
  )
}

/** KC-0096 — Follow-ups tab hosts outcome-driven Today's Actions (tab label unchanged). */
export function RuknFollowUpsPanel({
  ruknId,
  karkuns,
}: {
  ruknId: string
  karkuns: KarkunRegistryRecord[]
}) {
  return <TodaysActionsPanel ruknId={ruknId} karkuns={karkuns} />
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
