/**
 * Module 11 — Smart Quick Actions
 * Context-aware shortcuts from session memory + last entity.
 */

import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import type { RafeeqSessionMemory } from '../session'
import type { RafeeqAction, RafeeqRole } from '../types'

export function buildSmartQuickActions(
  role: RafeeqRole,
  memory: RafeeqSessionMemory,
): readonly RafeeqAction[] {
  const actions: RafeeqAction[] = []
  const person = memory.lastPersonName
  const personRoute = memory.lastRoute

  if (person) {
    actions.push({
      id: 'qa-call',
      label: `Call ${person}`,
      route: `?rafeeqSafe=call&name=${encodeURIComponent(person)}`,
      description: 'Safe action: Call',
      primaryActionLabel: 'Call',
    })
    actions.push({
      id: 'qa-wa',
      label: `WhatsApp ${person}`,
      route: `?rafeeqSafe=whatsapp&name=${encodeURIComponent(person)}`,
      description: 'Safe action: WhatsApp',
    })
    actions.push({
      id: 'qa-profile',
      label: 'Open Profile',
      route: personRoute ?? `?rafeeqSearch=${encodeURIComponent(person)}`,
    })
  }

  actions.push({
    id: 'qa-assignment',
    label: 'Open Assignment',
    route: role === 'administrator' ? adminAssignmentsPath() : ROUTES.RUKN_MY_KARKUN,
  })
  actions.push({
    id: 'qa-attendance',
    label: 'Attendance',
    route:
      role === 'administrator' ? ROUTES.ADMIN_WEEKLY_IJTEMA : ROUTES.RUKN_WEEKLY_IJTEMA,
  })
  actions.push({
    id: 'qa-campaign',
    label: 'Campaign',
    route: role === 'administrator' ? ROUTES.ADMIN : ROUTES.RUKN,
  })
  actions.push({
    id: 'qa-reports',
    label: 'Reports',
    route: role === 'administrator' ? ROUTES.ADMIN_ACTIVITIES : ROUTES.RUKN_CAMPAIGN_RECORD,
  })
  actions.push({
    id: 'qa-reminder',
    label: 'Reminder',
    route: role === 'administrator' ? ROUTES.ADMIN_INBOX : ROUTES.RUKN_MY_KARKUN,
    description: 'Open existing reminder / communication UI',
  })

  if (memory.lastRoute) {
    actions.unshift({
      id: 'qa-open-it',
      label: 'Open it',
      route: memory.lastRoute,
    })
  }

  return Object.freeze(actions.slice(0, 10))
}
