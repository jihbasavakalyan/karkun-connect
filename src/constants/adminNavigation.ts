import { ACTIVITIES_MODULES } from '@/lib/activitiesNavigation'
import { adminCommunicationPath, ROUTES } from '@/constants/routes'
import type { IconName } from '@/design-system/iconNames'

/** Single destination in the admin sidebar / mobile nav. */
export type AdminNavItem = {
  id: string
  label: string
  icon: IconName
  to: string
  end?: boolean
}

/**
 * Expandable nav group (KC-0115).
 * Children are the stable destinations; parent `to` is the hub / default landing.
 */
export type AdminNavGroup = {
  id: string
  label: string
  icon: IconName
  to: string
  children: AdminNavItem[]
}

export type AdminNavEntry = AdminNavItem | AdminNavGroup

export function isAdminNavGroup(entry: AdminNavEntry): entry is AdminNavGroup {
  return Array.isArray((entry as AdminNavGroup).children)
}

/**
 * KC-0115 — V1 frozen Information Architecture.
 *
 * Top level: Dashboard · Campaign · Rukn · Karkun · Muttafiqeen · Connections ·
 * Activities · Communication · Settings
 * (Help remains footer-only.)
 */
export const ADMIN_NAV_ITEMS: AdminNavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', to: ROUTES.ADMIN, end: true },
  {
    id: 'mission-workspace',
    label: 'Mission Workspace',
    icon: 'flag',
    to: ROUTES.ADMIN_MISSION_WORKSPACE,
  },
  { id: 'inbox', label: 'Inbox', icon: 'message', to: ROUTES.ADMIN_INBOX },
  { id: 'campaign', label: 'Campaign', icon: 'chart', to: ROUTES.ADMIN_CAMPAIGN },
  { id: 'reports', label: 'Reports', icon: 'file-text', to: ROUTES.ADMIN_REPORTS },
  { id: 'rukn', label: 'Rukn', icon: 'user', to: ROUTES.ADMIN_RUKN },
  { id: 'karkun', label: 'Karkun', icon: 'users', to: ROUTES.ADMIN_KARKUN },
  { id: 'muttafiqeen', label: 'Muttafiqeen', icon: 'users', to: ROUTES.ADMIN_MUTTAFIQEEN },
  { id: 'assignments', label: 'Connections', icon: 'link', to: ROUTES.ADMIN_ASSIGNMENTS },
  {
    id: 'activities',
    label: 'Activities',
    icon: 'clipboard',
    to: ROUTES.ADMIN_ACTIVITIES,
    children: ACTIVITIES_MODULES.map((mod) => ({
      id: mod.id,
      label: mod.label,
      icon: mod.icon,
      to: mod.to,
    })),
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'megaphone',
    to: ROUTES.ADMIN_COMMUNICATION,
    children: [
      {
        id: 'broadcast',
        label: 'Broadcast',
        icon: 'megaphone',
        to: adminCommunicationPath('broadcast'),
      },
      {
        id: 'saved-lists',
        label: 'Saved Lists',
        icon: 'clipboard',
        to: ROUTES.ADMIN_LISTS,
      },
      {
        id: 'communication-history',
        label: 'History',
        icon: 'file-text',
        to: ROUTES.ADMIN_COMMUNICATION_HISTORY,
      },
    ],
  },
  { id: 'settings', label: 'Settings', icon: 'settings', to: ROUTES.ADMIN_SETTINGS },
  { id: 'help', label: 'Help', icon: 'help', to: ROUTES.ADMIN_HELP },
]

/** Flat leaves for mobile strip and active-route matching. */
export function flattenAdminNavItems(entries: AdminNavEntry[] = ADMIN_NAV_ITEMS): AdminNavItem[] {
  const out: AdminNavItem[] = []
  for (const entry of entries) {
    if (isAdminNavGroup(entry)) {
      out.push({ id: entry.id, label: entry.label, icon: entry.icon, to: entry.to })
      out.push(...entry.children)
    } else {
      out.push(entry)
    }
  }
  return out
}
