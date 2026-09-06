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
  connectedRuknLabel: string
  relationshipLabel: string
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
  if (active.length === 1) {
    const current = active[0]!
    return {
      status: 'one',
      activeCount: 1,
      current,
      connectedRuknLabel: formatPersonNameForDisplay(current.ruknName || current.ruknId),
      relationshipLabel: UI_LABELS.connected,
    }
  }
  if (active.length > 1) {
    return {
      status: 'duplicate',
      activeCount: active.length,
      current: null,
      connectedRuknLabel: 'Needs review',
      relationshipLabel: 'Needs review',
    }
  }
  if (input.hasPendingLink) {
    return {
      status: 'pending',
      activeCount: 0,
      current: null,
      connectedRuknLabel: '—',
      relationshipLabel: UI_LABELS.pending,
    }
  }
  return {
    status: 'none',
    activeCount: 0,
    current: null,
    connectedRuknLabel: '—',
    relationshipLabel: UI_LABELS.notConnected,
  }
}
