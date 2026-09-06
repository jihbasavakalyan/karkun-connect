/**
 * KC-0124 — 360° Person Profile view models (presentation only).
 * Business rules stay in guidance, operations adapters, and people lifecycle.
 */

import type { ContinuousKarkunJourneySnapshot } from '@/lib/journey/continuousKarkunJourney'

export type PersonCampaignStatusItem = {
  id: string
  label: string
  value: string
  tone: 'ok' | 'pending' | 'neutral'
}

export type PersonTimelineRow = {
  id: string
  date: string
  activity: string
  actor: string
  module: string
  status: string
}

export type PersonCommunicationRow = {
  id: string
  sentAt: string
  title: string
  actor: string
  status: string
  preview: string
}

export type PersonAssignmentHistoryRow = {
  assignmentId: string
  assignmentNumber: string
  ruknId: string
  ruknName: string
  status: string
  connectedSince: string
  endedDate?: string
}

export type PersonQuickAction = {
  id: string
  label: string
  href?: string
  kind: 'link' | 'placeholder'
}

export type Person360Profile = {
  personId: string
  found: boolean
  header: {
    name: string
    mobile: string
    gender: string
    registry: string
    campaignStatus: string
    connectedRuknName: string
    connectedCount?: number
    ward: string
    area: string
    photoPlaceholder: string
  }
  responsibility: {
    responsibleRuknName: string
    connectedSince: string
    connectionStatus: string
    assignmentHistory: PersonAssignmentHistoryRow[]
  }
  campaignStatus: PersonCampaignStatusItem[]
  journeyStages: { id: string; label: string; complete: boolean; current: boolean }[]
  continuousJourney: ContinuousKarkunJourneySnapshot | null
  timeline: PersonTimelineRow[]
  communications: PersonCommunicationRow[]
  quickActions: PersonQuickAction[]
  inboxHref: string
  journeyHref: string
  connectionHref: string
}
