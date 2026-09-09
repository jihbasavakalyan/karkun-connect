import { ROUTES } from '@/constants/routes'

/**
 * Increment 07 — Admin Communication primary IA.
 * Query-param sections only — AppRouter path `/admin/communication` unchanged.
 * COS placeholder ids remain resolvable for deep links; they are not primary nav.
 */

export const COMMUNICATION_PRIMARY_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'rukn', label: 'Rukn Messages' },
  { id: 'karkun', label: 'Karkun Messages' },
  { id: 'daily-reports', label: 'Daily Reports' },
  { id: 'template-library', label: 'Official Communications' },
  { id: 'individual', label: 'Individual / Broadcast' },
  { id: 'templates', label: 'Custom Communications' },
  { id: 'history', label: 'History / Failed' },
  { id: 'tool-settings', label: 'WhatsApp Settings' },
] as const

/** Deep-link / legacy sections kept off the primary nav. */
export const COMMUNICATION_SECONDARY_SECTIONS = [
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'failed', label: 'Failed' },
  { id: 'automation', label: 'Automation Rules' },
  { id: 'queue', label: 'Communication Queue' },
  { id: 'audiences', label: 'Audience' },
  { id: 'journeys', label: 'Journeys' },
  { id: 'delivery', label: 'Delivery Center' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
] as const

export const COMMUNICATION_SECTIONS = [
  ...COMMUNICATION_PRIMARY_SECTIONS,
  ...COMMUNICATION_SECONDARY_SECTIONS,
] as const

export type CommunicationSection = (typeof COMMUNICATION_SECTIONS)[number]['id']

export type CommunicationPrimarySection = (typeof COMMUNICATION_PRIMARY_SECTIONS)[number]['id']

const PRIMARY_IDS = new Set<string>(COMMUNICATION_PRIMARY_SECTIONS.map((section) => section.id))

const COS_PLACEHOLDER_IDS = new Set<CommunicationSection>([
  'queue',
  'audiences',
  'journeys',
  'delivery',
  'reports',
  'settings',
])

const SECTION_ALIASES: Record<string, CommunicationSection> = {
  overview: 'overview',
  'mission-center': 'overview',
  mission: 'overview',
  dashboard: 'overview',
  queue: 'queue',
  'communication-queue': 'queue',
  audiences: 'audiences',
  audience: 'audiences',
  journeys: 'journeys',
  journey: 'journeys',
  'template-library': 'template-library',
  templates: 'templates',
  delivery: 'delivery',
  'delivery-center': 'delivery',
  reports: 'reports',
  settings: 'settings',
  'tool-settings': 'tool-settings',
  whatsapp: 'tool-settings',
  rukn: 'rukn',
  'rukn-messages': 'rukn',
  'rukn-communication': 'rukn',
  karkun: 'karkun',
  'karkun-messages': 'karkun',
  'karkun-communication': 'karkun',
  'daily-reports': 'daily-reports',
  daily: 'daily-reports',
  'daily-progress': 'daily-reports',
  arkaan: 'daily-reports',
  individual: 'individual',
  'individual-messages': 'individual',
  broadcast: 'broadcast',
  'broadcast-messages': 'broadcast',
  scheduled: 'scheduled',
  'scheduled-messages': 'scheduled',
  automation: 'automation',
  'automation-rules': 'automation',
  history: 'history',
  'delivery-history': 'history',
  failed: 'failed',
  'failed-messages': 'failed',
}

export function resolveCommunicationSection(sectionParam: string | null): CommunicationSection {
  if (sectionParam && SECTION_ALIASES[sectionParam]) {
    return SECTION_ALIASES[sectionParam]
  }
  if (COMMUNICATION_SECTIONS.some((section) => section.id === sectionParam)) {
    return sectionParam as CommunicationSection
  }
  return 'overview'
}

export function isCommunicationPrimarySection(section: CommunicationSection): boolean {
  return PRIMARY_IDS.has(section)
}

export function isCommunicationCosPlaceholderSection(section: CommunicationSection): boolean {
  return COS_PLACEHOLDER_IDS.has(section)
}

export function communicationPrimaryNavId(
  section: CommunicationSection,
): CommunicationPrimarySection | null {
  if (section === 'broadcast') return 'individual'
  if (section === 'failed' || section === 'scheduled') return 'history'
  if (PRIMARY_IDS.has(section)) return section as CommunicationPrimarySection
  return null
}

export function adminCommunicationPath(section?: string): string {
  const resolved = resolveCommunicationSection(section ?? null)
  return resolved === 'overview'
    ? ROUTES.ADMIN_COMMUNICATION
    : `${ROUTES.ADMIN_COMMUNICATION}?section=${resolved}`
}
