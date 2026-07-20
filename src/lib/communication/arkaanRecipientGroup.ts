/**
 * KC-0060 — Permanent Arkaan recipient group.
 * Recipients resolve automatically from Rukn Master (active, non-archived).
 * Administrators never manually select Arkaan members for daily distribution.
 */

import { ruknMaster } from '@/data/ruknMaster'
import type { MessageRecipient } from '@/types/communication'

export const ARKAAN_GROUP_ID = 'system-arkaan'
export const ARKAAN_GROUP_NAME = 'Arkaan'

export type ArkaanRecipientGroup = {
  id: typeof ARKAAN_GROUP_ID
  name: typeof ARKAAN_GROUP_NAME
  source: 'rukn-master'
  permanent: true
  recipients: MessageRecipient[]
}

/** Active Rukns from master — the permanent Arkaan distribution list. */
export function resolveArkaanRecipients(): MessageRecipient[] {
  return ruknMaster
    .filter((rukn) => rukn.status === 'active' && !rukn.isArchived && Boolean(rukn.mobile?.trim()))
    .map((rukn) => ({
      personId: rukn.id,
      personKind: 'rukn' as const,
      name: rukn.name,
      mobile: rukn.mobile.trim(),
      whatsapp: rukn.whatsapp?.trim() || undefined,
    }))
}

export function getArkaanRecipientGroup(): ArkaanRecipientGroup {
  return {
    id: ARKAAN_GROUP_ID,
    name: ARKAAN_GROUP_NAME,
    source: 'rukn-master',
    permanent: true,
    recipients: resolveArkaanRecipients(),
  }
}
