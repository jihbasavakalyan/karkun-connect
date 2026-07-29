/**
 * Module 14 — Guided Workflow
 * Continuous conversational flow: Find → Profile → Assignment → Call → WA → Reminder → Summary.
 */

import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import type { RafeeqSessionMemory } from '../session'
import { searchPeopleReadOnly } from '../adapters/searchAdapter'
import type { RafeeqAction, RafeeqRole } from '../types'
import { buildSmartQuickActions } from './quickActions'
import type { GuidedStep } from './types'

export function buildGuidedWorkflow(
  role: RafeeqRole,
  memory: RafeeqSessionMemory,
  personQuery: string | null,
): {
  readonly steps: readonly GuidedStep[]
  readonly text: string
  readonly actions: readonly RafeeqAction[]
} {
  const query = personQuery?.trim() || memory.lastPersonName || ''
  const hits = query ? searchPeopleReadOnly(query, 1) : []
  const person = hits[0]
  if (person) {
    memory.lastPersonId = person.personId
    memory.lastPersonName = person.name
    memory.lastRoute = person.profilePath
  }

  const steps: GuidedStep[] = [
    {
      id: 'find',
      label: query ? `Find ${query}` : 'Find person',
      action: person
        ? { id: 'gw-find', label: person.name, route: person.profilePath }
        : undefined,
    },
    {
      id: 'profile',
      label: 'Open Profile',
      action: person
        ? {
            id: 'gw-profile',
            label: 'Open Profile',
            route: person.profilePath,
          }
        : undefined,
    },
    {
      id: 'assignment',
      label: 'Show Assignment',
      action: {
        id: 'gw-asg',
        label: 'Open Assignment',
        route:
          role === 'administrator'
            ? adminAssignmentsPath()
            : ROUTES.RUKN_MY_KARKUN,
      },
    },
    {
      id: 'call',
      label: 'Call',
      action: person
        ? {
            id: 'gw-call',
            label: `Call ${person.name}`,
            route: `?rafeeqSafe=call&name=${encodeURIComponent(person.name)}`,
          }
        : undefined,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      action: person
        ? {
            id: 'gw-wa',
            label: `WhatsApp ${person.name}`,
            route: `?rafeeqSafe=whatsapp&name=${encodeURIComponent(person.name)}`,
          }
        : undefined,
    },
    {
      id: 'reminder',
      label: 'Mark Reminder',
      action: {
        id: 'gw-rem',
        label: 'Reminder',
        route:
          role === 'administrator' ? ROUTES.ADMIN_INBOX : ROUTES.RUKN_MY_KARKUN,
      },
    },
    {
      id: 'summary',
      label: 'Return Summary',
      action: undefined,
    },
  ]

  const text = person
    ? [
        `ہدایتی بہاؤ — ${person.name}`,
        ...steps.map((s, i) => `${i + 1}. ${s.label}`),
        '',
        'گفتگو جاری رکھیں: Call / WhatsApp / Open Profile / Explain more',
      ].join('\n')
    : [
        'ہدایتی بہاؤ شروع کرنے کے لیے نام بتائیں (Find Ahmed).',
        ...steps.map((s, i) => `${i + 1}. ${s.label}`),
      ].join('\n')

  const actions = [
    ...steps.filter((s) => s.action).map((s) => s.action!),
    ...buildSmartQuickActions(role, memory).slice(0, 3),
  ]

  return {
    steps: Object.freeze(steps),
    text,
    actions: Object.freeze(actions),
  }
}
