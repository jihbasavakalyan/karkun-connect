/**
 * Navigation target → existing ROUTES (no duplicate routing logic).
 */

import {
  ROUTES,
  adminAssignmentsPath,
} from '@/constants/routes'
import type { RafeeqRole } from './types'

export type NavigationResolution = {
  readonly target: string
  readonly route: string
  readonly label: string
}

export function resolveNavigationTarget(
  target: string,
  role: RafeeqRole,
): NavigationResolution | null {
  const admin = role === 'administrator'

  switch (target) {
    case 'dashboard':
      return {
        target,
        route: admin ? ROUTES.ADMIN : ROUTES.RUKN,
        label: 'ڈیش بورڈ',
      }
    case 'registry':
      return {
        target,
        route: admin ? ROUTES.ADMIN_KARKUN : ROUTES.RUKN_MY_KARKUN,
        label: 'رجسٹری',
      }
    case 'weekly_ijtema':
    case 'attendance':
      return {
        target,
        route: admin ? ROUTES.ADMIN_WEEKLY_IJTEMA : ROUTES.RUKN_WEEKLY_IJTEMA,
        label: 'ہفتہ وار اجتماع',
      }
    case 'reports':
      return {
        target,
        route: admin ? ROUTES.ADMIN_ACTIVITIES : ROUTES.RUKN_CAMPAIGN_RECORD,
        label: 'رپورٹس',
      }
    case 'settings':
      return {
        target,
        route: admin ? ROUTES.ADMIN_SETTINGS : ROUTES.RUKN_SETTINGS,
        label: 'ترتیبات',
      }
    case 'assignments':
      return {
        target,
        route: admin ? adminAssignmentsPath() : ROUTES.RUKN_AVAILABLE_KARKUN,
        label: 'تفویض / کنکشن',
      }
    case 'campaign':
      return {
        target,
        route: admin ? ROUTES.ADMIN_CAMPAIGN : ROUTES.RUKN_CAMPAIGN_RECORD,
        label: 'مہم',
      }
    case 'muttafiq':
      return {
        target,
        route: admin ? ROUTES.ADMIN_MUTTAFIQEEN : ROUTES.RUKN_AVAILABLE_KARKUN,
        label: 'متفقین',
      }
    default:
      return null
  }
}
