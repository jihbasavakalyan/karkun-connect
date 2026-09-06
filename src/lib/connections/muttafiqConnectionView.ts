/**
 * Muttafiq single-active Rukn helpers (no store imports — safe for repositories).
 */

import { UI_LABELS } from '@/lib/uiTerminology'
import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'

export const MUTTAFIQ_ALREADY_HAS_ACTIVE_RUKN_MESSAGE =
  'This Muttafiq already has an active Rukn relationship.'

export const MUTTAFIQ_DUPLICATE_ACTIVE_RUKN_MESSAGE =
  'This Muttafiq has more than one active Rukn relationship. Resolve the duplicates before connecting.'

export function findOtherActiveMuttafiqRelationship(
  rows: readonly MuttafiqRuknRelationship[],
  personId: string,
  exceptRelationshipId: string,
): MuttafiqRuknRelationship | undefined {
  const id = personId.trim()
  const exceptId = exceptRelationshipId.trim()
  return rows.find(
    (row) => row.personId === id && row.status === 'Active' && row.id !== exceptId,
  )
}

export type MuttafiqConnectionView = {
  status: 'none' | 'one' | 'duplicate' | 'pending'
  activeCount: number
  current: MuttafiqRuknRelationship | null
  connectedRuknId: string | null
  connectedRuknLabel: string
  relationshipLabel: string
  diagnosticRuknIds: string[]
}

/**
 * Authoritative Muttafiq list/profile display from `muttafiqRelationships`.
 * Ended history never counts as active. Duplicates are reported, not guessed.
 */
export function presentMuttafiqConnectionView(input: {
  activeLinks: readonly MuttafiqRuknRelationship[]
  hasPendingLink?: boolean
}): MuttafiqConnectionView {
  const active = input.activeLinks.filter((row) => row.status === 'Active')
  const diagnosticRuknIds = active.map((row) => row.ruknId)
  if (active.length === 1) {
    const current = active[0]!
    return {
      status: 'one',
      activeCount: 1,
      current,
      connectedRuknId: current.ruknId,
      connectedRuknLabel: formatPersonNameForDisplay(current.ruknName || current.ruknId),
      relationshipLabel: UI_LABELS.connected,
      diagnosticRuknIds,
    }
  }
  if (active.length > 1) {
    return {
      status: 'duplicate',
      activeCount: active.length,
      current: null,
      connectedRuknId: null,
      connectedRuknLabel: 'Needs review',
      relationshipLabel: 'Needs review',
      diagnosticRuknIds,
    }
  }
  if (input.hasPendingLink) {
    return {
      status: 'pending',
      activeCount: 0,
      current: null,
      connectedRuknId: null,
      connectedRuknLabel: '—',
      relationshipLabel: UI_LABELS.pending,
      diagnosticRuknIds,
    }
  }
  return {
    status: 'none',
    activeCount: 0,
    current: null,
    connectedRuknId: null,
    connectedRuknLabel: '—',
    relationshipLabel: UI_LABELS.notConnected,
    diagnosticRuknIds,
  }
}
