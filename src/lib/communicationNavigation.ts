import { ROUTES } from '@/constants/routes'

/**
 * KC-0077 — Communication Centre sections grouped by audience.
 * Query-param sections only — AppRouter routes unchanged.
 */
export const COMMUNICATION_SECTION_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    sections: [{ id: 'dashboard', label: 'Dashboard' }] as const,
  },
  {
    id: 'rukn',
    label: 'Rukn Communication',
    sections: [
      { id: 'rukn', label: 'Rukn Messages' },
      { id: 'daily-reports', label: 'Daily Reports' },
      { id: 'broadcast', label: 'Broadcast to Arkaan' },
    ] as const,
  },
  {
    id: 'karkun',
    label: 'Karkun Communication',
    sections: [
      { id: 'karkun', label: 'Karkun Messages' },
      { id: 'individual', label: 'Individual Messages' },
    ] as const,
  },
  {
    id: 'shared',
    label: 'Templates & Delivery',
    sections: [
      { id: 'templates', label: 'Templates' },
      { id: 'scheduled', label: 'Scheduled Messages' },
      { id: 'automation', label: 'Automation Rules' },
      { id: 'history', label: 'Delivery History' },
      { id: 'failed', label: 'Failed Messages' },
      { id: 'settings', label: 'Settings' },
    ] as const,
  },
] as const

export const COMMUNICATION_SECTIONS = COMMUNICATION_SECTION_GROUPS.flatMap((group) =>
  group.sections.map((section) => ({ ...section, group: group.id })),
)

export type CommunicationSection = (typeof COMMUNICATION_SECTIONS)[number]['id']

const SECTION_ALIASES: Record<string, CommunicationSection> = {
  dashboard: 'dashboard',
  rukn: 'rukn',
  'rukn-messages': 'rukn',
  'rukn-communication': 'rukn',
  karkun: 'karkun',
  'karkun-messages': 'karkun',
  'karkun-communication': 'karkun',
  'daily-reports': 'daily-reports',
  daily: 'daily-reports',
  reports: 'daily-reports',
  'daily-progress': 'daily-reports',
  arkaan: 'daily-reports',
  individual: 'individual',
  'individual-messages': 'individual',
  broadcast: 'broadcast',
  'broadcast-messages': 'broadcast',
  templates: 'templates',
  scheduled: 'scheduled',
  'scheduled-messages': 'scheduled',
  automation: 'automation',
  'automation-rules': 'automation',
  history: 'history',
  'delivery-history': 'history',
  failed: 'failed',
  'failed-messages': 'failed',
  settings: 'settings',
  whatsapp: 'settings',
}

export function resolveCommunicationSection(sectionParam: string | null): CommunicationSection {
  if (sectionParam && SECTION_ALIASES[sectionParam]) {
    return SECTION_ALIASES[sectionParam]
  }
  if (COMMUNICATION_SECTIONS.some((section) => section.id === sectionParam)) {
    return sectionParam as CommunicationSection
  }
  return 'dashboard'
}

export function adminCommunicationPath(section?: CommunicationSection): string {
  return section ? `${ROUTES.ADMIN_COMMUNICATION}?section=${section}` : ROUTES.ADMIN_COMMUNICATION
}
