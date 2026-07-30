/**
 * KC-035F — Resolve voice navigation (UI route only).
 * Reuses MVP resolveNavigationTarget — no duplicate route tables.
 */

import { resolveNavigationTarget } from '@/conversation/mvp/navigationMap'
import type { IntentCode } from '@/intents'
import { intentToNavigationTarget } from './intentToTarget'
import type {
  NavigationRole,
  VoiceNavigationResult,
} from './models/NavigationTypes'
import { NAVIGATION_URDU } from './responses/navigationUrduCopy'

export type ResolveVoiceNavigationInput = {
  readonly intent: IntentCode
  readonly role: NavigationRole
  /** Optional person profile deep-link. */
  readonly personId?: string | null
}

export function resolveVoiceNavigation(
  input: ResolveVoiceNavigationInput,
): VoiceNavigationResult {
  const target = intentToNavigationTarget(input.intent)
  if (!target) {
    return {
      ok: false,
      target: null,
      route: null,
      labelUrdu: '',
      responseUrdu: NAVIGATION_URDU.unknown,
      action: 'noop',
    }
  }

  if (target === 'back') {
    return {
      ok: true,
      target: 'back',
      route: null,
      labelUrdu: 'واپس',
      responseUrdu: NAVIGATION_URDU.back,
      action: 'back',
    }
  }

  if (target === 'home') {
    const home = resolveNavigationTarget('dashboard', input.role)
    return {
      ok: true,
      target: 'home',
      route: home?.route ?? null,
      labelUrdu: home?.label ?? 'ڈیش بورڈ',
      responseUrdu: NAVIGATION_URDU.home,
      action: 'home',
    }
  }

  const resolved = resolveNavigationTarget(target, input.role)
  if (!resolved) {
    return {
      ok: false,
      target,
      route: null,
      labelUrdu: '',
      responseUrdu: NAVIGATION_URDU.unknown,
      action: 'noop',
    }
  }

  let route = resolved.route
  if (input.personId && target === 'registry') {
    route = `/people/${input.personId}`
  }

  return {
    ok: true,
    target,
    route,
    labelUrdu: resolved.label,
    responseUrdu: NAVIGATION_URDU.opening(resolved.label),
    action: 'navigate',
  }
}
