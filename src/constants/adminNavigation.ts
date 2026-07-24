import { ROUTES } from '@/constants/routes'
import type { IconName } from '@/design-system/iconNames'

export type AdminNavItem = {
  id: string
  label: string
  icon: IconName
  to: string
  end?: boolean
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', to: ROUTES.ADMIN, end: true },
  { id: 'campaign', label: 'Campaign', icon: 'chart', to: ROUTES.ADMIN_CAMPAIGN },
  { id: 'rukn', label: 'Rukn', icon: 'user', to: ROUTES.ADMIN_RUKN },
  { id: 'karkun', label: 'Karkuns', icon: 'users', to: ROUTES.ADMIN_KARKUN },
  { id: 'muttafiqeen', label: 'Muttafiqeen', icon: 'users', to: ROUTES.ADMIN_MUTTAFIQEEN },
  { id: 'assignments', label: 'Connections', icon: 'link', to: ROUTES.ADMIN_ASSIGNMENTS },
  { id: 'execution', label: 'Execution', icon: 'file-text', to: ROUTES.ADMIN_EXECUTION },
  { id: 'compliance', label: 'Compliance', icon: 'check', to: ROUTES.ADMIN_COMPLIANCE },
  { id: 'weekly-ijtema', label: 'Weekly Ijtema', icon: 'clipboard', to: ROUTES.ADMIN_WEEKLY_IJTEMA },
  {
    id: 'baitul-maal',
    label: 'Baitul Maal',
    icon: 'check',
    to: ROUTES.ADMIN_MONTHLY_BAITUL_MAAL,
  },
  { id: 'follow-up', label: 'Follow-up', icon: 'refresh', to: ROUTES.ADMIN_FOLLOW_UP },
  { id: 'communication', label: 'Communication', icon: 'megaphone', to: ROUTES.ADMIN_COMMUNICATION },
  { id: 'lists', label: 'Lists', icon: 'clipboard', to: ROUTES.ADMIN_LISTS },
  { id: 'settings', label: 'Settings', icon: 'settings', to: ROUTES.ADMIN_SETTINGS },
  { id: 'help', label: 'Help', icon: 'help', to: ROUTES.ADMIN_HELP },
]
