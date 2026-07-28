/**
 * KC-0124 — StatusAggregator: campaign status strip from existing ops adapters.
 */

import { getMonthlyBaitulMaalComplianceStatusView } from '@/lib/operations/monthlyBaitulMaalReadAdapter'
import { getWeeklyIjtemaCurrentAttendanceView } from '@/lib/operations/weeklyIjtemaReadAdapter'
import {
  getCurrentMonthReportingStatus,
  getRegistrationForKarkun,
} from '@/services/jihWebPortalService'
import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import { getMessageHistory } from '@/services/historyService'
import { getLatestSubmissionForKarkun } from '@/stores/annexure1Store'
import type { PersonCampaignStatusItem } from './types'

export function aggregatePersonCampaignStatus(personId: string): PersonCampaignStatusItem[] {
  const visit = getLatestSubmissionForKarkun(personId)
  const registration = getRegistrationForKarkun(personId)
  const monthly = getCurrentMonthReportingStatus(personId)
  const ijtema = getWeeklyIjtemaCurrentAttendanceView(personId)
  const baitul = getMonthlyBaitulMaalComplianceStatusView(personId)
  const followUp = getActiveFollowUpForKarkun(personId)
  const latestMessage = getMessageHistory({ personId })[0]

  const visitDone = Boolean(visit && visit.status === 'submitted')
  const regDone = registration.status === 'Registered'

  return [
    {
      id: 'visit',
      label: 'Visit',
      value: visitDone ? 'Completed' : 'Pending',
      tone: visitDone ? 'ok' : 'pending',
    },
    {
      id: 'registration',
      label: 'Registration',
      value: regDone ? 'Completed' : 'Pending',
      tone: regDone ? 'ok' : 'pending',
    },
    {
      id: 'ijtema',
      label: 'Weekly Ijtema',
      value: ijtema.status === 'Not recorded' ? 'No attendance yet' : ijtema.status,
      tone: ijtema.status === 'Present' ? 'ok' : 'neutral',
    },
    {
      id: 'baitul',
      label: 'Monthly Baitul Maal',
      value: baitul.status,
      tone: baitul.status === 'Paid' ? 'ok' : 'pending',
    },
    {
      id: 'followup',
      label: 'Follow-up',
      value: followUp
        ? followUp.status === 'Completed'
          ? 'Completed'
          : 'Open'
        : monthly.status === 'Submitted'
          ? 'Completed'
          : 'Open',
      tone: followUp?.status === 'Completed' ? 'ok' : 'pending',
    },
    {
      id: 'communication',
      label: 'Communication',
      value: latestMessage
        ? latestMessage.templateName || latestMessage.status
        : 'No messages yet',
      tone: latestMessage ? 'ok' : 'neutral',
    },
  ]
}
