import { ROUTES } from '@/constants/routes'

/**
 * KC-0091 — Admin Communication Workspace sections (COS foundation).
 * Query-param sections only — AppRouter path `/admin/communication` unchanged.
 *
 * Messaging Tools group preserves existing KC-0077 panels so deep links and
 * workflows keep working. No new delivery/messaging implementation in this sprint.
 */

export const COMMUNICATION_SECTION_GROUPS = [
  {
    id: 'workspace',
    label: 'Communication Workspace',
    sections: [
      { id: 'mission-center', label: 'Mission Center' },
      { id: 'queue', label: 'Communication Queue' },
      { id: 'audiences', label: 'Audiences' },
      { id: 'journeys', label: 'Journeys' },
      { id: 'template-library', label: 'Official Communications' },
      { id: 'delivery', label: 'Delivery Center' },
      { id: 'reports', label: 'Reports' },
      { id: 'settings', label: 'Settings' },
    ] as const,
  },
  {
    id: 'messaging-tools',
    label: 'Messaging Tools (existing)',
    sections: [
      { id: 'rukn', label: 'Rukn Messages' },
      { id: 'daily-reports', label: 'Daily Reports' },
      { id: 'broadcast', label: 'Broadcast to Arkaan' },
      { id: 'karkun', label: 'Karkun Messages' },
      { id: 'individual', label: 'Individual Messages' },
      { id: 'templates', label: 'Custom Communications' },
      { id: 'scheduled', label: 'Scheduled Messages' },
      { id: 'automation', label: 'Automation Rules' },
      { id: 'history', label: 'Delivery History' },
      { id: 'failed', label: 'Failed Messages' },
      { id: 'tool-settings', label: 'WhatsApp Settings' },
    ] as const,
  },
] as const

export const COMMUNICATION_SECTIONS = COMMUNICATION_SECTION_GROUPS.flatMap((group) =>
  group.sections.map((section) => ({ ...section, group: group.id })),
)

export type CommunicationSection = (typeof COMMUNICATION_SECTIONS)[number]['id']

const SECTION_ALIASES: Record<string, CommunicationSection> = {
  'mission-center': 'mission-center',
  mission: 'mission-center',
  dashboard: 'mission-center',
  overview: 'mission-center',
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
  return 'mission-center'
}

export function adminCommunicationPath(section?: CommunicationSection): string {
  return section && section !== 'mission-center'
    ? `${ROUTES.ADMIN_COMMUNICATION}?section=${section}`
    : ROUTES.ADMIN_COMMUNICATION
}
