/**
 * KC-0115 — Activities workspace module registry (presentation / IA only).
 *
 * Add future recurring organizational activities here (Training, Ramadan,
 * Annual Review, Special Programs, …). Sidebar and hub read this list —
 * do not invent parallel navigation trees.
 */

import { adminExecutionPath, adminFollowUpPath, ROUTES } from '@/constants/routes'
import type { IconName } from '@/design-system/iconNames'

export type ActivitiesModule = {
  id: string
  label: string
  description: string
  icon: IconName
  to: string
}

/** Permanent V1 Activities modules — extend this array for future programs. */
export const ACTIVITIES_MODULES: ActivitiesModule[] = [
  {
    id: 'weekly-ijtema',
    label: 'Weekly Ijtema',
    description: 'Attendance management and reports for the active weekly event.',
    icon: 'clipboard',
    to: ROUTES.ADMIN_WEEKLY_IJTEMA,
  },
  {
    id: 'monthly-baitul-maal',
    label: 'Monthly Baitul Maal',
    description: 'Monthly contribution completion and cycle reports.',
    icon: 'check',
    to: ROUTES.ADMIN_MONTHLY_BAITUL_MAAL,
  },
  {
    id: 'follow-up',
    label: 'Follow-up',
    description: 'Pending and completed follow-up work for connected Karkuns.',
    icon: 'refresh',
    to: adminFollowUpPath(),
  },
  {
    id: 'campaign-execution',
    label: 'Campaign Execution',
    description:
      'Pending connections, visits, app registration, Weekly Ijtema, Baitul Maal, and overall campaign progress.',
    icon: 'flag',
    to: adminExecutionPath(),
  },
]

export function getActivitiesModuleByPath(pathname: string, search: string): ActivitiesModule | undefined {
  const path = pathname.replace(/\/$/, '') || pathname
  return ACTIVITIES_MODULES.find((mod) => {
    const url = new URL(mod.to, 'https://kc.local')
    if (url.pathname.replace(/\/$/, '') !== path) return false
    if (!url.search) return true
    const want = new URLSearchParams(url.search)
    const have = new URLSearchParams(search)
    for (const [key, value] of want.entries()) {
      if (have.get(key) !== value) return false
    }
    return true
  })
}
