import { ROUTES } from '@/constants/routes'

export const COMMUNICATION_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'individual', label: 'Individual Messages' },
  { id: 'broadcast', label: 'Broadcast Messages' },
  { id: 'templates', label: 'Templates' },
  { id: 'scheduled', label: 'Scheduled Messages' },
  { id: 'automation', label: 'Automation Rules' },
  { id: 'history', label: 'Delivery History' },
  { id: 'failed', label: 'Failed Messages' },
  { id: 'settings', label: 'Settings' },
] as const

export type CommunicationSection = (typeof COMMUNICATION_SECTIONS)[number]['id']

const SECTION_ALIASES: Record<string, CommunicationSection> = {
  dashboard: 'dashboard',
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
