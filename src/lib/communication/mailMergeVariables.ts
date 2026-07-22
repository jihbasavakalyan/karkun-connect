/**
 * KC-0077.1 — Mail-merge variable catalog (presentation only).
 * Audience-aware placeholders for personalized bulk communication.
 */

import type { MessageRecipientKind } from '@/types/communication'

export type MailMergeVariableDef = {
  /** Placeholder key inserted as {{Key}} */
  key: string
  label: string
  audiences: readonly MessageRecipientKind[]
}

/** Insertable variables shown in the template editor and documented for Send All. */
export const MAIL_MERGE_VARIABLES: readonly MailMergeVariableDef[] = [
  { key: 'KarkunName', label: 'Karkun Name', audiences: ['karkun'] },
  { key: 'RuknName', label: 'Rukn Name', audiences: ['karkun', 'rukn'] },
  { key: 'CampaignName', label: 'Campaign', audiences: ['karkun', 'rukn'] },
  { key: 'CurrentStatus', label: 'Status', audiences: ['karkun'] },
  { key: 'ConnectionStatus', label: 'Connection Status', audiences: ['karkun'] },
  { key: 'LastVisitDate', label: 'Last Visit', audiences: ['karkun'] },
  { key: 'PendingAction', label: 'Pending Action', audiences: ['karkun'] },
  { key: 'NextMeeting', label: 'Next Meeting', audiences: ['karkun'] },
  { key: 'Area', label: 'Area', audiences: ['karkun'] },
  { key: 'Phone', label: 'Phone', audiences: ['karkun', 'rukn'] },
  { key: 'TodaysDate', label: "Today's Date", audiences: ['karkun', 'rukn'] },
  { key: 'AssignedKarkunCount', label: 'Assigned Karkun Count', audiences: ['rukn'] },
  { key: 'TodaysVisits', label: "Today's Visits", audiences: ['rukn'] },
  { key: 'PendingFollowUps', label: 'Pending Follow-ups', audiences: ['rukn'] },
  // Legacy short keys still used by existing templates
  { key: 'name', label: 'Name (legacy {name})', audiences: ['karkun', 'rukn'] },
  { key: 'campaign', label: 'Campaign (legacy)', audiences: ['karkun', 'rukn'] },
  { key: 'date', label: 'Date (legacy)', audiences: ['karkun', 'rukn'] },
  { key: 'time', label: 'Time (legacy)', audiences: ['karkun', 'rukn'] },
  { key: 'venue', label: 'Venue (legacy)', audiences: ['karkun', 'rukn'] },
  { key: 'event', label: 'Event (legacy)', audiences: ['karkun', 'rukn'] },
  { key: 'month', label: 'Month (legacy)', audiences: ['karkun', 'rukn'] },
] as const

export function listMailMergeVariablesForAudience(
  audience: MessageRecipientKind | 'all',
): MailMergeVariableDef[] {
  if (audience === 'all') return [...MAIL_MERGE_VARIABLES]
  return MAIL_MERGE_VARIABLES.filter((item) => item.audiences.includes(audience))
}

export const MAIL_MERGE_FALLBACK = '-'
