/**
 * KC-0091 — Static mock data for Communication Workspace foundation.
 * No backend, delivery, or AI — placeholders only.
 */

export type AdminAttentionCard = {
  id: string
  title: string
  summary: string
  countLabel: string
  tone: 'attention' | 'reminder' | 'appreciation' | 'pending' | 'draft'
}

export const ADMIN_MISSION_ATTENTION_CARDS: AdminAttentionCard[] = [
  {
    id: 'visit-follow-ups',
    title: 'Visit Follow-ups Due',
    summary: 'Connected relationships waiting for a promised follow-up visit or call.',
    countLabel: '12 due today',
    tone: 'attention',
  },
  {
    id: 'weekly-ijtema',
    title: 'Weekly Ijtema Reminders',
    summary: 'Rukns and Connected Karkuns who may benefit from a gentle Ijtema reminder.',
    countLabel: '8 reminders',
    tone: 'reminder',
  },
  {
    id: 'appreciation',
    title: 'Appreciation Opportunities',
    summary: 'Recent attendance and effort worth acknowledging with dignity.',
    countLabel: '5 opportunities',
    tone: 'appreciation',
  },
  {
    id: 'pending-comms',
    title: 'Pending Communications',
    summary: 'Draft or queued mission communications awaiting administrator review.',
    countLabel: '3 pending',
    tone: 'pending',
  },
  {
    id: 'draft-campaigns',
    title: 'Draft Campaigns',
    summary: 'Campaign communication packs started but not yet activated.',
    countLabel: '2 drafts',
    tone: 'draft',
  },
]

export type RafeeqSuggestion = {
  id: string
  text: string
  kind: 'visit' | 'reminder' | 'appreciation' | 'follow-up'
}

export const RUKN_RAFEEQ_SUGGESTIONS: RafeeqSuggestion[] = [
  {
    id: 'visit-gap',
    text: 'You have not visited Ahmed in 10 days.',
    kind: 'visit',
  },
  {
    id: 'ijtema-reminder',
    text: 'Weekly Ijtema reminder is due.',
    kind: 'reminder',
  },
  {
    id: 'appreciate-attendance',
    text: 'Consider appreciating attendance.',
    kind: 'appreciation',
  },
  {
    id: 'follow-up-promise',
    text: 'A follow-up was promised after the last visit — confirm the next step.',
    kind: 'follow-up',
  },
]

export const COS_PLACEHOLDER_NOTE =
  'Foundation placeholder — messaging, delivery, and automation arrive in later sprints (KC-0092+).'
