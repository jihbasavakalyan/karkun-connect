/**
 * KC-0119 — ContextResolver
 * Maps operational mission / screen signals to communication context.
 */

import type { CommunicationContextId } from './types'

export function resolveCommunicationContextFromMissionItemId(
  itemId: string,
): CommunicationContextId | null {
  if (itemId.includes('visit')) return 'pending-visits'
  if (itemId.includes('weekly-ijtema') || itemId.includes('ijtema')) {
    return 'pending-weekly-ijtema'
  }
  if (itemId.includes('baitul') || itemId.includes('maal')) return 'pending-baitul-maal'
  if (itemId.includes('app-registration') || itemId.includes('jih')) {
    return 'pending-jih-registration'
  }
  if (itemId.includes('follow-up')) return 'follow-up-pending'
  if (itemId.includes('assignment')) return 'new-assignment'
  if (itemId.includes('activity') || itemId.includes('no-activity')) return 'no-activity'
  return null
}

/** @deprecated Use resolveCommunicationContextFromMissionItemId */
export const communicationContextFromMissionItemId =
  resolveCommunicationContextFromMissionItemId
