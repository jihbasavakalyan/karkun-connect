/**
 * Navigation target → existing ROUTES (no duplicate routing logic).
 */

import {
  ROUTES,
  adminAssignmentsPath,
} from '@/constants/routes'
import type { RafeeqEntityType, RafeeqRole } from './types'

export type NavigationResolution = {
  readonly target: string
  readonly route: string
  readonly label: string
  readonly entityType: RafeeqEntityType
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
        entityType: 'dashboard',
      }
    case 'registry':
      return {
        target,
        route: admin ? ROUTES.ADMIN_KARKUN : ROUTES.RUKN_MY_KARKUN,
        label: 'رجسٹری',
        entityType: 'module',
      }
    case 'weekly_ijtema':
      return {
        target,
        route: admin ? ROUTES.ADMIN_WEEKLY_IJTEMA : ROUTES.RUKN_WEEKLY_IJTEMA,
        label: 'ہفتہ وار اجتماع',
        entityType: 'weekly_ijtema',
      }
    case 'attendance':
      return {
        target,
        route: admin ? ROUTES.ADMIN_WEEKLY_IJTEMA : ROUTES.RUKN_WEEKLY_IJTEMA,
        label: 'حاضری',
        entityType: 'attendance',
      }
    case 'reports':
      // KC-037 V1 — Admin Activities (legacy voice target); Rukns → Campaign Record (no Report Center).
      return {
        target,
        route: admin ? ROUTES.ADMIN_ACTIVITIES : ROUTES.RUKN_CAMPAIGN_RECORD,
        label: admin ? 'رپورٹس' : 'مہم ریکارڈ',
        entityType: 'report',
      }
    case 'settings':
      return {
        target,
        route: admin ? ROUTES.ADMIN_SETTINGS : ROUTES.RUKN_SETTINGS,
        label: 'ترتیبات',
        entityType: 'settings',
      }
    case 'assignments':
      return {
        target,
        route: admin ? adminAssignmentsPath() : ROUTES.RUKN_AVAILABLE_KARKUN,
        label: 'تفویض / کنکشن',
        entityType: 'module',
      }
    case 'activities':
      return {
        target,
        route: admin ? ROUTES.ADMIN_ACTIVITIES : ROUTES.RUKN_CAMPAIGN_RECORD,
        label: 'سرگرمیاں',
        entityType: 'module',
      }
    case 'follow_up':
      return {
        target,
        route: admin ? ROUTES.ADMIN_FOLLOW_UP : ROUTES.RUKN,
        label: 'فالو اپ',
        entityType: 'module',
      }
    case 'campaign':
      return {
        target,
        route: admin ? ROUTES.ADMIN_CAMPAIGN : ROUTES.RUKN_CAMPAIGN_RECORD,
        label: 'مہم',
        entityType: 'campaign',
      }
    case 'muttafiq':
      return {
        target,
        route: admin ? ROUTES.ADMIN_MUTTAFIQEEN : ROUTES.RUKN_AVAILABLE_KARKUN,
        label: 'متفقین',
        entityType: 'module',
      }
    case 'baitul_maal':
      return {
        target,
        route: admin
          ? ROUTES.ADMIN_MONTHLY_BAITUL_MAAL
          : ROUTES.RUKN_MONTHLY_BAITUL_MAAL,
        label: 'بیت المال',
        entityType: 'module',
      }
    default:
      return null
  }
}
