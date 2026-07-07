import { ROUTES } from '@/constants/routes'

export type AdminNavItem = {
  id: string
  label: string
  icon: string
  to: string
  end?: boolean
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', to: ROUTES.ADMIN, end: true },
  { id: 'campaign', label: 'Campaign', icon: '📊', to: ROUTES.ADMIN_CAMPAIGN },
  { id: 'rukn', label: 'Rukn', icon: '🧑', to: ROUTES.ADMIN_RUKN },
  { id: 'karkun', label: 'Karkun', icon: '👥', to: ROUTES.ADMIN_KARKUN },
  { id: 'assignments', label: 'Connections', icon: '🔗', to: ROUTES.ADMIN_ASSIGNMENTS },
  { id: 'execution', label: 'Execution', icon: '📝', to: ROUTES.ADMIN_EXECUTION },
  { id: 'compliance', label: 'Compliance', icon: '✅', to: ROUTES.ADMIN_COMPLIANCE },
  { id: 'follow-up', label: 'Follow-up', icon: '🔄', to: ROUTES.ADMIN_FOLLOW_UP },
  { id: 'communication', label: 'Communication', icon: '📣', to: ROUTES.ADMIN_COMMUNICATION },
  { id: 'lists', label: 'Lists', icon: '📋', to: ROUTES.ADMIN_LISTS },
  { id: 'settings', label: 'Settings', icon: '⚙️', to: ROUTES.ADMIN_SETTINGS },
  { id: 'help', label: 'Help', icon: '❓', to: ROUTES.ADMIN_HELP },
]
