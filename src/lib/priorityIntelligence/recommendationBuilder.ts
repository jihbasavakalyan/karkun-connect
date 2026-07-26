/**
 * KC-0120 — RecommendationBuilder
 * Maps priority rule signals to recommended actions (engine-owned, not UI).
 */

import {
  adminAssignmentsPath,
  adminCompliancePath,
  adminExecutionPath,
  adminFollowUpPath,
  adminKarkunPendingRequestsPath,
  adminMonthlyBaitulMaalPath,
  adminWeeklyIjtemaPath,
} from '@/constants/routes'
import type { PriorityRuleSignal } from './priorityRules'
import type { PriorityItem, PriorityRecommendedAction } from './types'

export function buildPriorityRecommendations(signals: PriorityRuleSignal[]): PriorityItem[] {
  return signals.map((signal) => ({
    id: signal.id,
    severity: signal.severity,
    reason: signal.reason,
    affectedPeopleLabel: signal.affectedPeopleLabel,
    affectedCount: signal.affectedCount,
    responsiblePersonLabel: signal.responsiblePersonLabel,
    responsibleRuknIds: signal.responsibleRuknIds,
    context: signal.context,
    recommendedAction: recommendationForSignal(signal),
    rank: signal.rank,
  }))
}

function recommendationForSignal(signal: PriorityRuleSignal): PriorityRecommendedAction {
  switch (signal.id) {
    case 'priority-pending-visits':
      return {
        kind: 'notify',
        label: 'Notify',
        recommendation: `Notify ${signal.affectedCount > 0 ? 'responsible Rukns' : 'Rukns'} about pending visits.`,
        communicationContext: 'pending-visits',
        route: adminExecutionPath('pending'),
      }
    case 'priority-pending-weekly-ijtema':
      return {
        kind: signal.affectedCount >= 5 ? 'notify' : 'review',
        label: signal.affectedCount >= 5 ? 'Notify' : 'Review',
        recommendation:
          signal.affectedCount >= 5
            ? `Notify ${signal.affectedCount} responsible Rukns.`
            : 'Prepare Weekly Ijtema Reminder / review pending attendance.',
        communicationContext: 'pending-weekly-ijtema',
        route: adminWeeklyIjtemaPath(),
      }
    case 'priority-pending-baitul-maal':
      return {
        kind: signal.affectedCount >= 5 ? 'notify' : 'review',
        label: signal.affectedCount >= 5 ? 'Notify' : 'Review',
        recommendation:
          signal.affectedCount >= 5
            ? `Notify ${signal.affectedCount} responsible Rukns.`
            : 'Review pending Monthly Baitul Maal completions.',
        communicationContext: 'pending-baitul-maal',
        route: adminMonthlyBaitulMaalPath(),
      }
    case 'priority-pending-jih-registration':
      return {
        kind: 'notify',
        label: 'Notify',
        recommendation: `Notify responsible Rukns about ${signal.affectedCount} incomplete registration${signal.affectedCount === 1 ? '' : 's'}.`,
        communicationContext: 'pending-jih-registration',
        route: adminCompliancePath('jih-portal'),
      }
    case 'priority-follow-up-pending':
      return {
        kind: 'review',
        label: 'Review',
        recommendation: 'Review Follow-up queue for pending interactions.',
        communicationContext: 'follow-up-pending',
        route: adminFollowUpPath(),
      }
    case 'priority-no-activity':
      return {
        kind: 'notify',
        label: 'Notify',
        recommendation: `Notify ${signal.affectedCount} responsible Rukns.`,
        communicationContext: 'no-activity',
      }
    case 'priority-pending-karkun-requests':
      return {
        kind: 'review',
        label: 'Review',
        recommendation: 'Review New Karkun requests in the Karkun module.',
        route: adminKarkunPendingRequestsPath(),
      }
    case 'priority-new-assignment':
      return {
        kind: 'review',
        label: 'Review',
        recommendation: 'Review New Assignments in Connections.',
        communicationContext: 'new-assignment',
        route: adminAssignmentsPath(),
      }
    default:
      return {
        kind: 'open',
        label: 'Open',
        recommendation: 'Open the related operational workspace.',
      }
  }
}
