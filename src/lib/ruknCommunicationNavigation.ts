/**
 * KC-0091 / Increment 07 — Rukn Communication Workspace section navigation.
 * Primary IA is people-first: My Connected Karkuns + Follow-ups.
 * Companion is a person drill-in route, not a tab.
 */

import { ROUTES } from '@/constants/routes'

export const RUKN_COMMUNICATION_PRIMARY_SECTIONS = [
  { id: 'my-karkuns', label: 'My Connected Karkuns' },
  { id: 'follow-ups', label: 'Follow-ups' },
] as const

/** Legacy query ids — still resolve, not shown as live Communication product. */
export const RUKN_COMMUNICATION_SECTIONS = [
  ...RUKN_COMMUNICATION_PRIMARY_SECTIONS,
  { id: 'conversations', label: 'Conversations' },
  { id: 'companion-ledger', label: 'Companion Ledger' },
  { id: 'visit-planning', label: 'Visit Planning' },
  { id: 'notes', label: 'Notes' },
  { id: 'rafeeq', label: 'Digital Rafeeq' },
] as const

export type RuknCommunicationSection = (typeof RUKN_COMMUNICATION_SECTIONS)[number]['id']

export type RuknCommunicationPrimarySection =
  (typeof RUKN_COMMUNICATION_PRIMARY_SECTIONS)[number]['id']

const PRIMARY_IDS = new Set<string>(
  RUKN_COMMUNICATION_PRIMARY_SECTIONS.map((section) => section.id),
)

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

export function isRuknCommunicationPrimarySection(
  section: RuknCommunicationSection,
): boolean {
  return PRIMARY_IDS.has(section)
}

export function ruknCommunicationPath(section?: RuknCommunicationSection): string {
  return section && section !== 'my-karkuns'
    ? `${ROUTES.RUKN_COMMUNICATION}?section=${section}`
    : ROUTES.RUKN_COMMUNICATION
}

export function ruknCompanionPath(karkunId: string): string {
  return `${ROUTES.RUKN_COMMUNICATION}/companion/${encodeURIComponent(karkunId)}`
}
