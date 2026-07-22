/**
 * KC-0091 — Rukn Communication Workspace section navigation.
 * People-first sections; not channel-first.
 */

import { ROUTES } from '@/constants/routes'

export const RUKN_COMMUNICATION_SECTIONS = [
  { id: 'my-karkuns', label: 'My Connected Karkuns' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'follow-ups', label: 'Follow-ups' },
  { id: 'companion-ledger', label: 'Companion Ledger' },
  { id: 'visit-planning', label: 'Visit Planning' },
  { id: 'notes', label: 'Notes' },
  { id: 'rafeeq', label: 'Digital Rafeeq' },
] as const

export type RuknCommunicationSection = (typeof RUKN_COMMUNICATION_SECTIONS)[number]['id']

const SECTION_ALIASES: Record<string, RuknCommunicationSection> = {
  'my-karkuns': 'my-karkuns',
  karkuns: 'my-karkuns',
  connected: 'my-karkuns',
  conversations: 'conversations',
  'follow-ups': 'follow-ups',
  followups: 'follow-ups',
  'companion-ledger': 'companion-ledger',
  ledger: 'companion-ledger',
  'visit-planning': 'visit-planning',
  visits: 'visit-planning',
  notes: 'notes',
  rafeeq: 'rafeeq',
  'digital-rafeeq': 'rafeeq',
}

export function resolveRuknCommunicationSection(
  sectionParam: string | null,
): RuknCommunicationSection {
  if (sectionParam && SECTION_ALIASES[sectionParam]) {
    return SECTION_ALIASES[sectionParam]
  }
  if (RUKN_COMMUNICATION_SECTIONS.some((section) => section.id === sectionParam)) {
    return sectionParam as RuknCommunicationSection
  }
  return 'my-karkuns'
}

export function ruknCommunicationPath(section?: RuknCommunicationSection): string {
  return section && section !== 'my-karkuns'
    ? `${ROUTES.RUKN_COMMUNICATION}?section=${section}`
    : ROUTES.RUKN_COMMUNICATION
}

export function ruknCompanionPath(karkunId: string): string {
  return `${ROUTES.RUKN_COMMUNICATION}/companion/${encodeURIComponent(karkunId)}`
}
