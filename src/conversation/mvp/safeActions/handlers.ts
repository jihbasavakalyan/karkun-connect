/**
 * Safe action handlers — existing links/routes only. No Firestore writes.
 */

import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { ROUTES, adminCommunicationPath, ruknCompanionPath } from '@/constants/routes'
import { searchPeopleReadOnly } from '../adapters/searchAdapter'
import { resolveNavigationTarget } from '../navigationMap'
import type { RafeeqAction, RafeeqRole, RafeeqTurnResult } from '../types'
import type { RafeeqSessionMemory } from '../session'
import {
  isReadOnlyOpen,
  requiresExplicitConfirmation,
  type PendingSafeAction,
  type SafeActionKind,
} from './policy'

function companion(text: string): string {
  const body = text.trim()
  if (/السلام علیکم/.test(body)) return body
  return `السلام علیکم\n\n${body}`
}

function base(
  partial: Omit<RafeeqTurnResult, 'usedStack' | 'usedFallback' | 'readOnly'>,
  readOnly: boolean,
): RafeeqTurnResult {
  return {
    ...partial,
    usedStack: true,
    usedFallback: false,
    readOnly,
  }
}

function reminderRoute(role: RafeeqRole, personId: string | null): string {
  if (role === 'administrator') {
    return adminCommunicationPath()
  }
  if (personId) return ruknCompanionPath(personId)
  return ROUTES.RUKN_COMMUNICATION
}

function followUps(kind: SafeActionKind): RafeeqAction[] {
  const chips: RafeeqAction[] = []
  if (kind === 'CALL' || kind === 'WHATSAPP') {
    chips.push({
      id: 'fu-whatsapp',
      label: 'WhatsApp him',
      route: '?rafeeq=WhatsApp him',
      description: 'follow-up',
      primaryActionLabel: 'پوچھیں',
    })
    chips.push({
      id: 'fu-call',
      label: 'Call him',
      route: '?rafeeq=Call him',
      description: 'follow-up',
      primaryActionLabel: 'پوچھیں',
    })
  }
  chips.push({
    id: 'fu-profile',
    label: 'Open profile',
    route: '?rafeeq=Open contact',
    description: 'follow-up',
    primaryActionLabel: 'پوچھیں',
  })
  return chips
}

function resolvePerson(subject: string | null, memory: RafeeqSessionMemory) {
  const query = subject?.trim() || memory.lastPersonName || ''
  if (!query) return null
  const hits = searchPeopleReadOnly(query, 3)
  return hits[0] ?? null
}

function setPending(memory: RafeeqSessionMemory, pending: PendingSafeAction | null): void {
  memory.pendingSafeAction = pending
}

export function handleConfirmOrCancel(
  layers: string[],
  kind: 'CONFIRM' | 'CANCEL',
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('safe_action_confirm')
  const pending = memory.pendingSafeAction

  if (!pending) {
    return base(
      {
        text: companion(
          kind === 'CONFIRM'
            ? 'تصدیق کے لیے کوئی زیر عمل نہیں۔'
            : 'منسوخ کرنے کے لیے کوئی زیر عمل نہیں۔',
        ),
        actions: [],
        intentCode: kind,
        requiresConfirmation: false,
        confirmationState: null,
        layersVisited: Object.freeze([...layers]),
        metadata: { executionResult: 'failed', reason: 'no_pending' },
      },
      true,
    )
  }

  if (kind === 'CANCEL') {
    setPending(memory, null)
    return base(
      {
        text: companion('عمل منسوخ کر دیا گیا۔'),
        actions: followUps(pending.kind).map((a) => ({
          ...a,
          id: `after-cancel-${a.id}`,
        })),
        intentCode: 'CANCEL',
        requiresConfirmation: false,
        confirmationState: 'CANCELLED',
        layersVisited: Object.freeze([...layers]),
        metadata: {
          executionResult: 'cancelled',
          executionMessage: 'Action cancelled',
          pendingKind: pending.kind,
        },
      },
      true,
    )
  }

  // CONFIRM
  setPending(memory, null)
  if (!pending.route) {
    return base(
      {
        text: companion(
          'عمل مکمل نہیں ہو سکا۔ متبادل: پروفائل کھولیں۔',
        ),
        actions: pending.personId
          ? [
              {
                id: 'alt-profile',
                label: 'Open profile',
                route: searchPeopleReadOnly(pending.personName ?? '', 1)[0]
                  ?.profilePath ?? ROUTES.RUKN_MY_KARKUN,
                primaryActionLabel: 'کھولیں',
              },
            ]
          : [],
        intentCode: 'CONFIRM',
        requiresConfirmation: false,
        confirmationState: 'CONFIRMED',
        layersVisited: Object.freeze([...layers]),
        metadata: {
          executionResult: 'failed',
          executionMessage: 'No launch route',
        },
      },
      true,
    )
  }

  const successLabel =
    pending.kind === 'WHATSAPP'
      ? '✓ WhatsApp opened'
      : pending.kind === 'CALL'
        ? '✓ Call launched'
        : pending.kind === 'REMINDER'
          ? '✓ Reminder opened'
          : '✓ Action completed'

  return base(
    {
      text: companion(`${successLabel}\n${pending.summary}`),
      actions: [
        {
          id: 'exec-confirmed',
          label: pending.label,
          route: pending.route,
          description: successLabel,
          primaryActionLabel: 'کھولیں',
          confirmRole: 'confirm',
        },
        ...followUps(pending.kind),
      ],
      intentCode: pending.kind,
      requiresConfirmation: false,
      confirmationState: 'CONFIRMED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        executionResult: 'success',
        executionMessage: successLabel,
        kind: pending.kind,
      },
    },
    pending.kind === 'REMINDER' || isReadOnlyOpen(pending.kind),
  )
}

export function handleSafeActionRequest(input: {
  layers: string[]
  kind: SafeActionKind
  subject: string | null
  extraKinds: readonly SafeActionKind[]
  role: RafeeqRole
  memory: RafeeqSessionMemory
  confirmationState: string
}): RafeeqTurnResult {
  const { layers, kind, subject, extraKinds, role, memory, confirmationState } = input
  layers.push('safe_action')

  if (kind === 'CONFIRM' || kind === 'CANCEL') {
    return handleConfirmOrCancel(layers, kind, memory)
  }

  // --- Reminder (placeholder via existing communication UI) ---
  if (kind === 'REMINDER') {
    const person = resolvePerson(subject, memory)
    if (person) {
      memory.lastPersonId = person.personId
      memory.lastPersonName = person.name
    }
    const route = reminderRoute(role, person?.personId ?? null)
    const summary = person
      ? `Create a reminder related to ${person.name} (opens existing communication UI — no new reminder engine).`
      : 'Open existing reminder / communication placeholder (no parallel reminder system).'
    setPending(memory, {
      kind: 'REMINDER',
      personId: person?.personId ?? null,
      personName: person?.name ?? null,
      route,
      label: 'Open Reminder',
      summary,
    })
    return base(
      {
        text: companion(
          `You are about to open the reminder workspace${person ? ` for ${person.name}` : ''}.\nProceed?\n[Confirm] [Cancel]`,
        ),
        actions: [
          {
            id: 'confirm-reminder',
            label: 'Confirm',
            route: '?rafeeqConfirm=1',
            confirmRole: 'confirm',
            primaryActionLabel: 'Confirm',
          },
          {
            id: 'cancel-reminder',
            label: 'Cancel',
            route: '?rafeeqCancel=1',
            confirmRole: 'cancel',
            primaryActionLabel: 'Cancel',
          },
        ],
        intentCode: 'REMINDER',
        requiresConfirmation: true,
        confirmationState,
        layersVisited: Object.freeze([...layers]),
        metadata: {
          pendingConfirmation: true,
          kind: 'REMINDER',
          pendingRoute: route,
        },
      },
      false,
    )
  }

  // --- Communication CALL / WHATSAPP ---
  if (kind === 'CALL' || kind === 'WHATSAPP') {
    const person = resolvePerson(subject, memory)
    if (!person) {
      return base(
        {
          text: companion(
            kind === 'CALL'
              ? 'کال کے لیے کارکن کا نام بتائیں۔'
              : 'واٹس ایپ کے لیے کارکن کا نام بتائیں۔',
          ),
          actions: [],
          intentCode: kind,
          requiresConfirmation: true,
          confirmationState,
          layersVisited: Object.freeze([...layers]),
          metadata: {
            executionResult: 'failed',
            executionMessage: 'Person not found',
          },
        },
        true,
      )
    }

    memory.lastPersonId = person.personId
    memory.lastPersonName = person.name

    const tel = buildTelLink(person.mobile)
    const wa = buildWhatsAppLink(person.mobile)
    const launch = kind === 'CALL' ? tel : wa

    if (!launch) {
      return base(
        {
          text: companion(
            `No phone number is available for ${person.name}.\nWould you like to open the profile instead?`,
          ),
          actions: [
            {
              id: 'alt-profile',
              label: 'Open profile',
              route: person.profilePath,
              primaryActionLabel: 'کھولیں',
              confirmRole: 'alternative',
            },
          ],
          intentCode: kind,
          requiresConfirmation: false,
          confirmationState,
          layersVisited: Object.freeze([...layers]),
          metadata: {
            executionResult: 'failed',
            executionMessage: 'No phone number',
            personId: person.personId,
          },
        },
        true,
      )
    }

    const summary =
      kind === 'WHATSAPP'
        ? `You are about to send a WhatsApp message to ${person.name}.`
        : `You are about to call ${person.name}.`

    setPending(memory, {
      kind,
      personId: person.personId,
      personName: person.name,
      route: launch,
      label: kind === 'WHATSAPP' ? `WhatsApp: ${person.name}` : `Call: ${person.name}`,
      summary,
    })

    return base(
      {
        text: companion(`${summary}\nProceed?\n[Confirm] [Cancel]`),
        actions: [
          {
            id: `confirm-${kind.toLowerCase()}`,
            label: 'Confirm',
            route: launch,
            confirmRole: 'confirm',
            primaryActionLabel: 'Confirm',
            description: summary,
          },
          {
            id: `cancel-${kind.toLowerCase()}`,
            label: 'Cancel',
            route: '?rafeeqCancel=1',
            confirmRole: 'cancel',
            primaryActionLabel: 'Cancel',
          },
          {
            id: `profile-${person.personId}`,
            label: 'Open profile',
            route: person.profilePath,
            confirmRole: 'alternative',
            primaryActionLabel: 'کھولیں',
          },
        ],
        intentCode: kind,
        requiresConfirmation: true,
        confirmationState,
        layersVisited: Object.freeze([...layers]),
        metadata: {
          pendingConfirmation: true,
          kind,
          personId: person.personId,
        },
      },
      false,
    )
  }

  // --- Read-only opens ---
  const actions: RafeeqAction[] = []
  const kinds = [kind, ...extraKinds]

  for (const openKind of kinds) {
    if (openKind === 'OPEN_PROFILE' || openKind === 'OPEN_CONTACT') {
      const person =
        resolvePerson(subject, memory) ||
        (memory.lastPersonId
          ? searchPeopleReadOnly(memory.lastPersonName ?? '', 1)[0]
          : null)
      if (person) {
        memory.lastPersonId = person.personId
        memory.lastPersonName = person.name
        actions.push({
          id: `open-profile-${person.personId}`,
          label: person.name,
          route: person.profilePath,
          description: 'Profile',
          primaryActionLabel: 'کھولیں',
          entityType: 'karkun',
        })
      } else if (memory.lastRoute) {
        actions.push({
          id: 'open-last',
          label: 'Open it',
          route: memory.lastRoute,
          primaryActionLabel: 'کھولیں',
        })
      }
      continue
    }

    if (openKind === 'OPEN_ASSIGNMENT') {
      const person = resolvePerson(subject, memory)
      const nav = resolveNavigationTarget('assignments', role)
      if (person && role === 'rukn') {
        // No assignment deep-link API — open profile + assignments module
        actions.push({
          id: `asn-profile-${person.personId}`,
          label: `${person.name} profile`,
          route: person.profilePath,
          primaryActionLabel: 'کھولیں',
        })
      }
      if (nav) {
        actions.push({
          id: 'open-assignments',
          label: nav.label,
          route: nav.route,
          entityType: nav.entityType,
          primaryActionLabel: 'کھولیں',
        })
      }
      continue
    }

    const navTarget =
      openKind === 'OPEN_ATTENDANCE'
        ? 'attendance'
        : openKind === 'OPEN_IJTEMA'
          ? 'weekly_ijtema'
          : openKind === 'OPEN_CAMPAIGN'
            ? 'campaign'
            : openKind === 'OPEN_REPORTS'
              ? 'reports'
              : null

    if (navTarget) {
      const nav = resolveNavigationTarget(navTarget, role)
      if (nav) {
        memory.lastRoute = nav.route
        actions.push({
          id: `open-${navTarget}`,
          label: nav.label,
          route: nav.route,
          entityType: nav.entityType,
          primaryActionLabel: 'کھولیں',
        })
      }
    }
  }

  if (actions.length === 0) {
    return base(
      {
        text: companion(
          'اسکرین نہیں کھل سکی۔ نام واضح کریں یا Dashboard کھولیں۔',
        ),
        actions: [
          {
            id: 'alt-dashboard',
            label: 'Dashboard',
            route: resolveNavigationTarget('dashboard', role)?.route ?? '/',
            primaryActionLabel: 'کھولیں',
          },
        ],
        intentCode: kind,
        requiresConfirmation: false,
        confirmationState: null,
        layersVisited: Object.freeze([...layers]),
        metadata: {
          executionResult: 'failed',
          executionMessage: 'Nothing to open',
        },
      },
      true,
    )
  }

  const first = actions[0]!
  memory.lastRoute = first.route

  return base(
    {
      text: companion(`✓ ${actions.map((a) => a.label).join(' · ')} کھولا جا سکتا ہے۔`),
      actions: [
        ...actions,
        {
          id: 'fu-done',
          label: 'Call him',
          route: '?rafeeq=Call him',
          confirmRole: 'followup',
          primaryActionLabel: 'پوچھیں',
        },
      ],
      intentCode: 'NAVIGATION',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        executionResult: 'success',
        executionMessage: '✓ Action ready',
        opensExistingUi: true,
        safeActionKind: kind,
        requiresExplicitConfirmation: requiresExplicitConfirmation(kind),
      },
    },
    true,
  )
}
