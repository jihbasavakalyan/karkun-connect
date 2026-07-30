/**
 * KC-035C — Service adapters (orchestrate existing repositories only).
 * Injectable for verification.
 */

import { updateKarkunMeetingOutcomes } from '@/constants/mockKarkunRegistry'
import {
  cycleJihAppForKarkun,
  getJihAppMatrixState,
  toggleVisitForKarkun,
} from '@/lib/campaignExecutionMatrix'
import { markWeeklyIjtemaAttendance } from '@/lib/operations/weeklyIjtemaWriteAdapter'
import { updateMonthlyBaitulMaalContribution } from '@/lib/operations/monthlyBaitulMaalWriteAdapter'

export type WorkflowServiceAdapters = {
  recordVisit: (input: {
    personId: string
    ruknId: string
    actorId: string
  }) => { success: true } | { success: false; error: string }
  recordAppRegistration: (input: {
    personId: string
    ruknId: string
  }) => { success: true } | { success: false; error: string }
  recordWeeklyIjtema: (input: {
    personId: string
    ruknId: string
    actorId: string
  }) => { success: true } | { success: false; error: string }
  recordBaitulMaal: (input: {
    personId: string
    ruknId: string
    actorId: string
  }) => { success: true } | { success: false; error: string }
}

export function createDefaultWorkflowAdapters(): WorkflowServiceAdapters {
  return {
    recordVisit: ({ personId, ruknId, actorId }) =>
      toggleVisitForKarkun(personId, ruknId, actorId),
    recordAppRegistration: ({ personId, ruknId }) => {
      const current = getJihAppMatrixState(personId)
      if (current === 'registered') return { success: true }
      updateKarkunMeetingOutcomes(personId, {
        jihAppRegistrationStatus: 'Registered',
        syncJihPortal: true,
      })
      if (getJihAppMatrixState(personId) !== 'registered') {
        const cycled = cycleJihAppForKarkun(personId, ruknId)
        return cycled.success
          ? { success: true }
          : { success: false, error: 'App registration update failed.' }
      }
      return { success: true }
    },
    recordWeeklyIjtema: ({ personId, ruknId, actorId }) => {
      const result = markWeeklyIjtemaAttendance({
        karkunId: personId,
        status: 'Present',
        updatedBy: actorId,
        ruknId,
      })
      return result.success
        ? { success: true }
        : { success: false, error: result.error }
    },
    recordBaitulMaal: ({ personId, ruknId, actorId }) => {
      const result = updateMonthlyBaitulMaalContribution({
        karkunId: personId,
        status: 'Paid',
        remarks: 'Campaign: Committed',
        updatedBy: actorId,
        ruknId,
      })
      return result.success
        ? { success: true }
        : { success: false, error: result.error }
    },
  }
}
