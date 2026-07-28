/**
 * KC-0123 — AuditRecorder facade (people audit + activity log).
 */

import { logPeopleAudit } from '@/lib/peopleAuditLog'
import { logActivity } from '@/stores/activityLogStore'

export function recordRegistryTransitionAudit(input: {
  personId: string
  personName: string
  actor: string
  oldRegistry: string
  newRegistry: string
  requestId?: string
  reason?: string
}): void {
  logPeopleAudit({
    personKind: 'karkun',
    personId: input.personId,
    personName: input.personName,
    action: 'reclassify',
    field: 'category',
    previousValue: input.oldRegistry,
    newValue: input.newRegistry,
    updatedBy: input.actor,
  })
  logActivity({
    type: 'complete',
    message: `Registry ${input.oldRegistry} → ${input.newRegistry} for ${input.personName}${
      input.requestId ? ` (request ${input.requestId})` : ''
    }${input.reason ? `: ${input.reason}` : ''}`,
    karkunId: input.personId,
    actor: input.actor,
  })
}
