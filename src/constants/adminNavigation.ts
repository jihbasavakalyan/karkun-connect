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
  { id: 'rukn', label: 'Rukn', icon: '👥', to: ROUTES.ADMIN_RUKN },
  { id: 'karkun', label: 'Karkun', icon: '👥', to: ROUTES.ADMIN_KARKUN },
  { id: 'assignments', label: 'Assignments', icon: '🔗', to: ROUTES.ADMIN_ASSIGNMENTS },
  { id: 'execution', label: 'Execution', icon: '📝', to: ROUTES.ADMIN_EXECUTION },
  { id: 'follow-up', label: 'Follow-up', icon: '🔄', to: ROUTES.ADMIN_FOLLOW_UP },
  { id: 'settings', label: 'Settings', icon: '⚙️', to: ROUTES.ADMIN_SETTINGS },
  { id: 'help', label: 'Help', icon: '❓', to: ROUTES.ADMIN_HELP },
]
